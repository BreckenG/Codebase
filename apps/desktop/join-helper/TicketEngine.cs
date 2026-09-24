using System;
using System.IO;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
namespace RankedWorld.JoinHelper;
internal sealed class LaunchTicket {
    internal string RequestId { get; }
    internal string Code { get; }
    internal long ExpiresAt { get; }
    internal LaunchTicket(string requestId, string code, long expiresAt) {
        RequestId = requestId; Code = code; ExpiresAt = expiresAt;
    }
}
internal static class TicketParser {
    internal static LaunchTicket? Parse(string? json, long now) {
        if (string.IsNullOrEmpty(json) || Encoding.UTF8.GetByteCount(json) > 4096) return null;
        try {
            using var input = new StringReader(json);
            using var reader = new JsonTextReader(input) { MaxDepth = 4, DateParseHandling = DateParseHandling.None };
            var value = JObject.Load(reader, new JsonLoadSettings { DuplicatePropertyNameHandling = DuplicatePropertyNameHandling.Error });
            if (reader.Read() || value.Count != 5) return null; if (value["version"]?.Type != JTokenType.Integer || (long)value["version"]! != 1) return null;
            if (value["requestId"]?.Type != JTokenType.String || !Guid.TryParseExact((string?)value["requestId"], "D", out var id) || id == Guid.Empty) return null;
            if (value["code"]?.Type != JTokenType.String) return null; var code = (string)value["code"]!; if (code.Length < 1 || code.Length > 12) return null;
            foreach (var ch in code)
                if (!(ch >= 'A' && ch <= 'Z') && !(ch >= '0' && ch <= '9')) return null;
            if (value["createdAt"]?.Type != JTokenType.Integer || value["expiresAt"]?.Type != JTokenType.Integer) return null; var created = (long)value["createdAt"]!;
            var expires = (long)value["expiresAt"]!; if (created < 0 || created > now || expires <= now || expires <= created || expires - created > 120000) return null;
            return new LaunchTicket(id.ToString("D"), code, expires);
        }
        catch (Exception err) when (err is JsonException || err is FormatException || err is OverflowException || err is ArgumentException) { return null; }
    }
}
internal sealed class TicketEngine {
    private readonly Action<LaunchTicket, string, string, long> publish; private readonly Action<LaunchTicket> join;
    private readonly System.Collections.Generic.Dictionary<string, long> consumed = new(); private readonly string? previous; private LaunchTicket? active;
    private int attempts; private long nextTry;
    internal TicketEngine(Action<LaunchTicket, string, string, long> publish, Action<LaunchTicket> join, string? consumed = null) {
        this.publish = publish; this.join = join; previous = consumed;
    }
    internal void Tick(string? json, long now, bool ready, string? room) {
        var incoming = TicketParser.Parse(json, now);
        if (active != null && (incoming == null || incoming.RequestId != active.RequestId || incoming.Code != active.Code || incoming.ExpiresAt != active.ExpiresAt)) {
            Finish("failed", now >= active.ExpiresAt ? "The join request expired." : "The join request was canceled or replaced.", now);
        }
        if (active == null) {
            if (incoming == null || incoming.RequestId == previous || consumed.ContainsKey(incoming.RequestId)) return;
            var expired = new System.Collections.Generic.List<string>();
            foreach (var item in consumed)
                if (item.Value <= now) expired.Add(item.Key);
            foreach (var key in expired) consumed.Remove(key); publish(incoming, "waiting", "Waiting for the game to finish signing in.", now); active = incoming;
            consumed[incoming.RequestId] = incoming.ExpiresAt; attempts = 0; nextTry = now;
        }
        if (string.Equals(room, active.Code, StringComparison.Ordinal)) {
            Finish("joined", "You joined the requested room.", now); return;
        }
        if (now < nextTry) return;
        if (attempts >= 3) {
            Finish("failed", "The game did not join the requested room. Try again from the launcher.", now); return;
        }
        if (!ready) return; publish(active, "joining", "Joining the requested room.", now); attempts++; nextTry = now + 15000;
        try { join(active); }
        catch { }
    }
    private void Finish(string state, string message, long now) {
        publish(active!, state, message, now); active = null;
    }
}
