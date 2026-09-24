using System;
using System.IO;
using System.Threading.Tasks;
using BepInEx;
using GorillaNetworking;
using Photon.Pun;
using PlayFab;
using UnityEngine;
namespace RankedWorld.JoinHelper;
[BepInPlugin("com.rankedworld.join", "JoinHelper", "1.0.0")]
public sealed class Plugin : BaseUnityPlugin {
    private TicketStore? store; private TicketEngine? engine; private Task? joining; private float nextPoll; private bool warned; private int processId;
    private void Awake() {
        store = new TicketStore(Path.Combine(Paths.ConfigPath, "RankedWorld")); engine = new TicketEngine(store.Publish, Join, store.PreviousRequest());
        using var process = System.Diagnostics.Process.GetCurrentProcess(); processId = process.Id;
    }
    private void Update() {
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
        }
        catch (Exception) {
            if (warned) return; warned = true; Logger.LogWarning("Ranked World could not process a join request. Check access to BepInEx/config/RankedWorld.");
        }
    }
    private void Join(LaunchTicket requested) {
        var ticket = TicketParser.Parse(store!.ReadTicket(), DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
        if (ticket == null || ticket.RequestId != requested.RequestId || ticket.Code != requested.Code || ticket.ExpiresAt != requested.ExpiresAt) return;
        joining = PhotonNetworkController.Instance.AttemptToJoinSpecificRoomAsync(requested.Code, JoinType.Solo, _ => { });
    }
}
