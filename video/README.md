# SlayDown product films

Two separate 30-second, 1080p Remotion walkthroughs share the SlayDown identity, infrastructure, and soundtrack. `SlayDown` is the original macOS composition and remains the default. `SlayDownOmarchy` is an Omarchy/Arch Linux composition built entirely from authentic captures made on the production computer. The [macOS script and storyboard](SCRIPT.md) describe the original cut; [Omarchy capture provenance](OMARCHY_CAPTURE.md) documents the Linux sources.

The SlayDown cut uses the bundled Metal Mania wordmark and “Eyesplit” by Shane Ivers, a recorded 154 BPM metal instrumental. The user approved this soundtrack on September 19, 2026. The 30-second excerpt fades under the end card. There is no narration. See [music attribution and source details](MUSIC.md).

## Reproduce

```sh
cd video
npm ci
npm run poster
npm run stills
npm run render
npm run verify
npm run social
```

Render and verify the Omarchy composition without changing the macOS outputs:

```sh
cd video
npm ci
npm run poster:omarchy
npm run stills:omarchy
npm run render:omarchy
npm run verify:omarchy
```

The screenshots are committed, so rendering needs no running SlayDown or editor instance. Rendering uses installed Google Chrome on Mac; set `REMOTION_BROWSER` to another Chromium executable if needed. The approved audio excerpt is committed as `public/eyesplit.m4a`, so ordinary rendering needs no music download. The final mux copies its AAC stream directly to avoid another lossy audio encode. To rebuild the excerpt from the artist’s original MP3, see [MUSIC.md](MUSIC.md). FFmpeg and FFprobe must be on PATH, or set `FFMPEG` and `FFPROBE`. Metal Mania is loaded from the bundled font. Other titles use local Iowan Old Style/Baskerville with Georgia fallback; render on Mac for matching typography.

- `src/SlayDownFilm.tsx`: scenes, copy, crops, and animation.
- `src/SlayDownOmarchyFilm.tsx`: separate Omarchy/Linux scenes, copy, and authentic capture crops.
- `src/timeline.json`: the shared 900-frame timeline, review frames, and static intervals.
- `src/omarchy-timeline.json`: the Omarchy cut’s 900-frame scene and review timing.
- `public/Agent workspace/`: public demo documents.
- `public/Omarchy demo/PLAN.md`: the public Linux capture document.
- `public/screenshots/slaydown-*.png`: the walkthrough captures.
- `public/screenshots/omarchy/`: the 12 authentic full-monitor Omarchy captures.
- `public/eyesplit.m4a`: approved licensed soundtrack excerpt.
- `scripts/soundtrack-recorded.mjs`: reproducible trim, fade, and loudness normalization.
- `scripts/soundtrack.py`: rejected synthesized experiment, retained as historical source.
- `scripts/soundtrack-warm.py`: the previous warm score, retained as an optional alternative.
- `out/SlayDown-Final.mp4`: H.264/AAC export.
- `out/SlayDown-Cover.png`: fully visible frame-zero splash.
- `out/SlayDown-Omarchy-Final.mp4`: separate Omarchy H.264/AAC export.
- `out/SlayDown-Omarchy-Cover.png`: separate Omarchy frame-zero cover.
- `src/SlayDownSocial.tsx`: the 1280 × 640 social card.

Working exports and full source downloads are ignored. The approved licensed audio excerpt is versioned. The macOS distribution MP4 remains `docs/media/SlayDownDemo.mp4`, with its cover in `docs/images/slaydown-video-poster.png`. The Omarchy cut is published separately as `docs/media/SlayDownOmarchyDemo.mp4`, with `docs/images/slaydown-omarchy-video-poster.png`. Never replace the macOS files while producing the Linux cut.

`SLAYDOWN_FRAMES=0,490,759 npm run stills` selects specific review frames. `SLAYDOWN_AUDIO_FROM=/absolute/path/approved.mp4 npm run render` preserves encoded audio from a separate approved MP4 of the **same duration**. The old `FOLIO_FRAMES` and `FOLIO_AUDIO_FROM` names remain accepted. Do not reuse the old 42-second film’s audio in this 30-second cut.

## Story and capture

Appearance has its own section: VS Code with blue tint → iA Writer with rose tint → Omarchy with amber tint. The editing section begins with Appearance closed and directs attention to **Open in Editor**. The external editor changes “A little room to read” to “A plan worth sharing.” The refreshed reader shows the new heading in both the document and outline.

Captured on September 18, 2026, using the installed SlayDown 0.2.0 app and iA Writer. All reader shots share a 1224 × 768 capture surface. Finder and Quick Look are native captures; the latter visibly offers **Open with SlayDown**. The editor was launched through SlayDown. Saving the changed heading updated the document and outline without a reload or reopen. The demo heading and appearance preferences were restored afterward.

Only the public PLAN.md is used. Preserve the demo’s original heading after capturing, and restore temporary reader preferences. Do not set a file-specific Finder association on the demo: an earlier capture exposed a macOS interaction between that override and quarantine metadata. [Apple documents the behavior for plain text](https://developer.apple.com/forums/thread/795994). Leave quarantine and system security settings intact.

Pointer/key illustrations, crops, cuts, and timing are added in Remotion. This is an edited screenshot demonstration, not a continuous recording or a launch-speed measurement. Space-bar preview is labeled as a Mac feature; Windows and Linux refer to the desktop reader. The user separately confirmed the earlier Folio build on Omarchy. No built-in editor is implied.

The `workflow-*` screenshots and old `FolioSocial.tsx` remain historical source assets. `npm run capture` is the legacy browser capture utility; it does not replace the native walkthrough captures.

## Export verification

The renderer uses lossless PNG frames, a single rendering page, and software `swangle` rendering. It verifies a candidate before replacing the final MP4; a failed check preserves the previous final.

`npm run verify -- out/another-export.mp4` checks another export. The verifier decodes the complete audio/video, requires 900 frames and 30-second streams, scans for blank frames and short corruption bursts, and compares deliberately static intervals. It was introduced after a parallel JPEG render produced tiled and blank frames despite valid codecs. These checks do not replace watching the actual MP4 and inspecting both sides of each appearance, editor, save, and refresh cut.

The September 19 SlayDown export passed the complete 900-frame scan and audio/video decoding. It is 1920 × 1080, 30 fps, H.264 High Profile / `yuv420p`, with 48 kHz stereo AAC-LC. Both streams and the container last 30 seconds. The file is 1.88 MB. Encoded audio measures −16.09 LUFS integrated and −6.24 dBTP true peak. Its encoded audio stream matches the user-approved Eyesplit preview exactly. The updated repository address was checked in the encoded opening and closing frames.

## GitHub and X

Use the finished demo and its cover on the public README, without production instructions beside it. For an inline GitHub attachment player, upload the MP4 in GitHub’s Markdown editor and use the resulting attachment URL. A cover linking to the committed MP4 also works without an attachment upload.

Upload `out/SlayDown-Final.mp4` directly to X. It is 16:9, 1920 × 1080, 30 fps, H.264 with `yuv420p`, stereo AAC, and fast-start metadata. The first frame is a complete cover; a separate PNG is available for flows that accept a thumbnail. X may transcode the upload. Include the [music credit](MUSIC.md#credit-for-publication) in the post. These scripts do not publish posts.

`npm run social` writes `docs/images/slaydown-social.png`, an opaque 1280 × 640 PNG under 1 MB. Upload it under repository **Settings → General → Social preview**; committing the image alone does not update GitHub’s link preview. It also works as a standalone image attachment. The repository is now `woodcreeper/slaydown`; GitHub redirects the previous `woodcreeper/folio` address.

Current GitHub attachment: https://github.com/user-attachments/assets/af304568-818d-4b9f-8540-d638357e0590

Distribution MP4 SHA-256: `8c459221daf18ddf69dd54ffbeeb905d269f17edb01c93a479d81ad35d55dc76`.
