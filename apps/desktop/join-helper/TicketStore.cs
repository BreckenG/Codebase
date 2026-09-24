using System;
using System.IO;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
namespace RankedWorld.JoinHelper;
internal sealed class TicketStore {
    private readonly string directory;
    internal TicketStore(string directory) { this.directory = directory; }
    internal string? ReadTicket() => ReadSmall(Path.Combine(directory, "launch.json"));
    internal string? PreviousRequest() {
        try {
            var json = ReadSmall(Path.Combine(directory, "launch-status.json")); if (json == null) return null; var value = JObject.Parse(json);
            return Guid.TryParseExact((string?)value["requestId"], "D", out var id) ? id.ToString("D") : null;
        }
        catch (Exception err) when (err is JsonException || err is ArgumentException) { return null; }
    }
    internal void Publish(LaunchTicket ticket, string state, string message, long now) {
        Write("launch-status.json", new JObject {
            ["version"] = 1,
            ["requestId"] = ticket.RequestId,
            ["code"] = ticket.Code,
            ["state"] = state,
            ["message"] = message,
            ["updatedAt"] = now
        });
    }
    internal void Heartbeat(int processId, long now) => Write("helper-live.json", new JObject {
        ["version"] = 1, ["processId"] = processId, ["updatedAt"] = now
    });
    private void Write(string name, JObject value) {
        Directory.CreateDirectory(directory); var destination = Path.Combine(directory, name);
        var temporary = destination + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try {
            File.WriteAllText(temporary, value.ToString(Formatting.None), new UTF8Encoding(false));
            if (File.Exists(destination)) File.Replace(temporary, destination, null); else File.Move(temporary, destination);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }
    private static string? ReadSmall(string path) {
        try {
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            if (stream.Length < 1 || stream.Length > 4096) return null; var buf = new byte[4097]; var total = 0;
            while (total < buf.Length) {
                var count = stream.Read(buf, total, buf.Length - total); if (count == 0) break; total += count;
            }
            return total > 4096 ? null : new UTF8Encoding(false, true).GetString(buf, 0, total);
        }
        catch (Exception err) when (err is IOException || err is UnauthorizedAccessException || err is DecoderFallbackException) { return null; }
    }
}
