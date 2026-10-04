using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Reflection;
using UnityEngine;
namespace RankedWorld.JoinHelper;
internal sealed class Note {
    internal string Kind = "info", Title = "", Body = "", Detail = "";
}
internal sealed class Overlay {
    private struct Glyph { internal int X, Y, W, H, Ox, Oy, Adv; }
    private sealed class Face { internal int Ascent, Line; internal readonly Dictionary<char, Glyph> Glyphs = new(); }
    private const int Width = 640, Radius = 14;
    private const float Hold = 4.6f, In = 0.22f, Out = 0.5f;
    private static readonly Color32 Fill = new(23, 26, 31, 242), Edge = new(48, 53, 58, 255), Text = new(240, 240, 236, 255), Muted = new(157, 164, 170, 255);
    private readonly Dictionary<string, Face> faces = new();
    private readonly Queue<Note> pending = new();
    private byte[] atlas = Array.Empty<byte>(); private int atlasWidth;
    private GameObject? panel; private Material? material; private Texture2D? texture; private Transform? anchor;
    private float shownAt = -1; private float aspect = 0.3f; private bool loaded, broken;
    internal bool Showing => shownAt >= 0;
    internal bool Broken => broken;
    internal void Push(Note note) {
        if (broken || pending.Count >= 6) return;
        pending.Enqueue(note);
    }
    internal void Tick(float now) {
        if (broken) return;
        try {
            if (shownAt < 0) {
                if (pending.Count == 0) return;
                var camera = Camera.main; if (camera == null) return;
                if (!loaded) Load();
                Show(pending.Dequeue(), camera.transform, now); return;
            }
            var age = now - shownAt;
            if (age >= In + Hold + Out || panel == null || anchor == null) { Hide(); return; }
            var alpha = age < In ? age / In : age > In + Hold ? 1f - (age - In - Hold) / Out : 1f;
            var ease = 1f - (1f - Mathf.Clamp01(age / In)) * (1f - Mathf.Clamp01(age / In));
            panel.transform.localPosition = new Vector3(0f, -0.16f + 0.02f * ease, 0.55f);
            material!.color = new Color(1f, 1f, 1f, Mathf.Clamp01(alpha));
        }
        catch (Exception) { broken = true; Hide(); }
    }
    private void Load() {
        var assembly = Assembly.GetExecutingAssembly();
        using (var stream = assembly.GetManifestResourceStream("RankedWorld.JoinHelper.Resources.font.bin")!) {
            var head = new byte[4]; stream.Read(head, 0, 4); atlasWidth = head[0] | head[1] << 8; var height = head[2] | head[3] << 8;
            atlas = new byte[atlasWidth * height]; var total = 0;
            while (total < atlas.Length) { var count = stream.Read(atlas, total, atlas.Length - total); if (count == 0) break; total += count; }
        }
        using (var reader = new StreamReader(assembly.GetManifestResourceStream("RankedWorld.JoinHelper.Resources.font.txt")!)) {
            Face? face = null; string? line;
            while ((line = reader.ReadLine()) != null) {
                var parts = line.Split(' ');
                if (parts[0] == "face") { face = new Face { Ascent = Int(parts[3]), Line = Int(parts[4]) }; faces[parts[1]] = face; continue; }
                if (face == null || parts.Length < 8) continue;
                face.Glyphs[(char)Int(parts[0])] = new Glyph { X = Int(parts[1]), Y = Int(parts[2]), W = Int(parts[3]), H = Int(parts[4]), Ox = Int(parts[5]), Oy = Int(parts[6]), Adv = Int(parts[7]) };
            }
        }
        loaded = true;
    }
    private static int Int(string value) => int.Parse(value, CultureInfo.InvariantCulture);
    private void Show(Note note, Transform camera, float now) {
        var title = faces["title"]; var body = faces["body"]; var hasDetail = note.Detail.Length > 0; var hasBody = note.Body.Length > 0;
        var height = 28 + title.Line + (hasBody ? body.Line + 6 : 0) + (hasDetail ? body.Line + 2 : 0) + 24;
        var pixels = new Color32[Width * height];
        Box(pixels, height);
        var accent = note.Kind == "up" ? new Color32(58, 208, 125, 255) : note.Kind == "down" ? new Color32(255, 92, 124, 255) : note.Kind == "rank" ? new Color32(238, 134, 42, 255) : Text;
        var y = 28;
        Draw(pixels, height, title, Fit(title, note.Title), 30, y, accent); y += title.Line;
        if (hasBody) { y += 6; Draw(pixels, height, body, Fit(body, note.Body), 30, y, Text); y += body.Line; }
        if (hasDetail) { y += 2; Draw(pixels, height, body, Fit(body, note.Detail), 30, y, Muted); }
        if (texture == null || texture.height != height) {
            if (texture != null) UnityEngine.Object.Destroy(texture);
            texture = new Texture2D(Width, height, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear };
        }
        texture.SetPixels32(pixels); texture.Apply(false);
        aspect = height / (float)Width;
        if (panel == null) Build();
        if (panel == null) { broken = true; return; }
        material!.mainTexture = texture; material.color = new Color(1f, 1f, 1f, 0f);
        anchor = camera; panel.transform.SetParent(camera, false);
        panel.transform.localRotation = Quaternion.identity; panel.transform.localScale = new Vector3(0.34f, 0.34f * aspect, 1f);
        panel.transform.localPosition = new Vector3(0f, -0.16f, 0.55f); panel.SetActive(true); shownAt = now;
    }
    private void Hide() {
        shownAt = -1;
        if (panel != null) panel.SetActive(false);
    }
    private void Build() {
        Shader? shader = null;
        foreach (var name in new[] { "UI/Default", "Sprites/Default", "Unlit/Transparent" }) { shader = Shader.Find(name); if (shader != null) break; }
        if (shader == null) return;
        material = new Material(shader) { renderQueue = 4000 };
        if (material.HasProperty("unity_GUIZTestMode")) material.SetInt("unity_GUIZTestMode", 8);
        var mesh = new Mesh {
            vertices = new[] { new Vector3(-0.5f, -0.5f, 0f), new Vector3(0.5f, -0.5f, 0f), new Vector3(0.5f, 0.5f, 0f), new Vector3(-0.5f, 0.5f, 0f) },
            uv = new[] { new Vector2(0f, 0f), new Vector2(1f, 0f), new Vector2(1f, 1f), new Vector2(0f, 1f) },
            colors32 = new[] { new Color32(255, 255, 255, 255), new Color32(255, 255, 255, 255), new Color32(255, 255, 255, 255), new Color32(255, 255, 255, 255) },
            triangles = new[] { 0, 2, 1, 0, 3, 2 }
        };
        panel = new GameObject("RankedWorldNotice"); panel.AddComponent<MeshFilter>().sharedMesh = mesh;
        var renderer = panel.AddComponent<MeshRenderer>(); renderer.sharedMaterial = material;
        renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off; renderer.receiveShadows = false;
        UnityEngine.Object.DontDestroyOnLoad(panel);
    }
    private string Fit(Face face, string value) {
        var clean = new System.Text.StringBuilder(); var width = 0;
        foreach (var raw in value) {
            var ch = face.Glyphs.ContainsKey(raw) ? raw : '?';
            var advance = face.Glyphs[ch].Adv; if (width + advance > Width - 60) break;
            clean.Append(ch); width += advance;
        }
        return clean.ToString();
    }
    private void Draw(Color32[] pixels, int height, Face face, string value, int x, int top, Color32 color) {
        foreach (var ch in value) {
            var glyph = face.Glyphs[ch];
            for (var gy = 0; gy < glyph.H; gy++) {
                var py = top + glyph.Oy + gy; if (py < 0 || py >= height) continue;
                var row = (height - 1 - py) * Width; var source = (glyph.Y + gy) * atlasWidth + glyph.X;
                for (var gx = 0; gx < glyph.W; gx++) {
                    var px = x + glyph.Ox + gx; if (px < 0 || px >= Width) continue;
                    var cover = atlas[source + gx]; if (cover == 0) continue;
                    var under = pixels[row + px]; var keep = 255 - cover;
                    pixels[row + px] = new Color32((byte)((color.r * cover + under.r * keep) / 255), (byte)((color.g * cover + under.g * keep) / 255), (byte)((color.b * cover + under.b * keep) / 255), (byte)Math.Max(under.a, cover));
                }
            }
            x += glyph.Adv;
        }
    }
    private static void Box(Color32[] pixels, int height) {
        for (var y = 0; y < height; y++) {
            for (var x = 0; x < Width; x++) {
                var dx = x < Radius ? Radius - x - 0.5f : x >= Width - Radius ? x - (Width - Radius) + 0.5f : 0f;
                var dy = y < Radius ? Radius - y - 0.5f : y >= height - Radius ? y - (height - Radius) + 0.5f : 0f;
                var inside = dx > 0f && dy > 0f ? Radius - Mathf.Sqrt(dx * dx + dy * dy) : Mathf.Min(Mathf.Min(x + 0.5f, Width - x - 0.5f), Mathf.Min(y + 0.5f, height - y - 0.5f));
                if (inside <= 0f) continue;
                var tone = inside < 2f ? Edge : Fill; var cover = Mathf.Clamp01(inside);
                pixels[y * Width + x] = new Color32(tone.r, tone.g, tone.b, (byte)(tone.a * cover));
            }
        }
    }
}
