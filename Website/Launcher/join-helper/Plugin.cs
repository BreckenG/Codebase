using System;
using System.IO;
using System.Threading.Tasks;
using BepInEx;
using GorillaNetworking;
using Photon.Pun;
using PlayFab;
using UnityEngine;
namespace RankedWorld.JoinHelper;
[BepInPlugin("com.rankedworld.join", "RankedHelper", "1.1.0")]
public sealed class Plugin : BaseUnityPlugin {
    TicketStore? store; TicketEngine? engine; Task? joining; float nextPoll; bool warned; int processId;
    readonly Overlay overlay = new(); string? lastNote; string lastState = ""; bool drew, overlayWarned;
    void Awake() {
        store = new TicketStore(Path.Combine(Paths.ConfigPath, "RankedWorld")); engine = new TicketEngine(Publish, Join, store.PreviousRequest());
        lastNote = store.ReadNote(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds())?.Id;
        using var process = System.Diagnostics.Process.GetCurrentProcess(); processId = process.Id;
    }
    void Publish(LaunchTicket ticket, string state, string message, long now) {
        store!.Publish(ticket, state, message, now);
        var key = ticket.RequestId + state; if (key == lastState) return; lastState = key;
        if (state == "joining") overlay.Push(new Note { Kind = "info", Title = "Joining " + ticket.Code, Body = "Sent from the launcher" });
        else if (state == "joined") overlay.Push(new Note { Kind = "up", Title = "You are in " + ticket.Code, Body = "Ranked room joined" });
        else if (state == "failed") overlay.Push(new Note { Kind = "down", Title = "Could not join " + ticket.Code, Body = message });
    }
    void Update() {
        overlay.Tick(Time.realtimeSinceStartup);
        if (overlay.Showing && !drew) { drew = true; Logger.LogInfo("Ranked World notifications are working."); }
        if (overlay.Broken && !overlayWarned) { overlayWarned = true; Logger.LogWarning("Ranked World could not draw a notification. Joining codes still works."); }
        if (Time.realtimeSinceStartup < nextPoll || store == null || engine == null) return; nextPoll = Time.realtimeSinceStartup + 0.5f;
        try {
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); store.Heartbeat(processId, now);
            if (joining?.IsFaulted == true) _ = joining.Exception;
            var ready = (joining == null || joining.IsCompleted)
                && PhotonNetworkController.Instance != null
                && GorillaComputer.instance != null
                && NetworkSystem.Instance != null
                && (NetworkSystem.Instance.netState == NetSystemState.Idle || NetworkSystem.Instance.netState == NetSystemState.InGame)
                && PlayFabClientAPI.IsClientLoggedIn()
                && PhotonNetwork.AuthValues != null
                && PhotonNetwork.LocalPlayer != null;
            var room = PhotonNetwork.InRoom ? PhotonNetwork.CurrentRoom?.Name : null;
            engine.Tick(store.ReadTicket(), now, ready, room);
            var note = store.ReadNote(now);
            if (note is { } fresh && fresh.Id != lastNote) { lastNote = fresh.Id; overlay.Push(fresh.Note); }
        }
        catch (Exception) {
            if (warned) return; warned = true; Logger.LogWarning("Ranked World could not process a join request. Check access to BepInEx/config/RankedWorld.");
        }
    }
    void Join(LaunchTicket requested) {
        var ticket = TicketParser.Parse(store!.ReadTicket(), DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
        if (ticket == null || ticket.RequestId != requested.RequestId || ticket.Code != requested.Code || ticket.ExpiresAt != requested.ExpiresAt) return;
        joining = PhotonNetworkController.Instance.AttemptToJoinSpecificRoomAsync(requested.Code, JoinType.Solo, _ => { });
    }
}
