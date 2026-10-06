#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/artifacts/maximus-erp-promo"
VOICE="$ROOT_DIR/attached_assets/vo_04_eve_1791249362103.mp3"
MUSIC="$ARTIFACT_DIR/public/audio/maximus-instrumental-80s.mp3"
MIX="$ARTIFACT_DIR/public/audio/composite_audio.mp3"
VIDEO="$ARTIFACT_DIR/public/exports/MAXIMUS-ERP-vertical-80s.mp4"
ARCHIVE="$ARTIFACT_DIR/archive/MAXIMUS-ERP-vertical-80s-instrumental-only.mp4"
MIX_TEMP="${MIX%.mp3}.tmp.mp3"
VIDEO_TEMP="${VIDEO%.mp4}.tmp.mp4"

for input in "$VOICE" "$MUSIC" "$VIDEO"; do
  if [[ ! -f "$input" ]]; then
    echo "Fichier requis introuvable : $input" >&2
    exit 1
  fi
done

command -v ffmpeg >/dev/null || { echo "ffmpeg est requis." >&2; exit 1; }

mkdir -p "$(dirname "$ARCHIVE")"
if [[ ! -f "$ARCHIVE" ]]; then
  cp --preserve=mode,timestamps "$VIDEO" "$ARCHIVE"
fi

cleanup() {
  rm -f "$MIX_TEMP" "$VIDEO_TEMP"
}
trap cleanup EXIT

echo "Mixage de la voix off avec l’instrumental…"
ffmpeg -hide_banner -loglevel warning -y \
  -i "$MUSIC" \
  -i "$VOICE" \
  -filter_complex \
  "[0:a]aresample=48000,asetpts=PTS-STARTPTS,volume=-2dB,apad=whole_dur=80.5,atrim=duration=80.5[bed]; \
   [1:a]aresample=48000,asetpts=PTS-STARTPTS,loudnorm=I=-17:TP=-2:LRA=7,apad=whole_dur=80.5,atrim=duration=80.5,asplit=2[sidechain][speech]; \
   [bed][sidechain]sidechaincompress=threshold=0.05:ratio=6:attack=20:release=350:makeup=1[ducked]; \
   [ducked][speech]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.95:attack=5:release=50[out]" \
  -map "[out]" -t 80.5 -c:a libmp3lame -b:a 192k -ar 48000 -ac 2 \
  "$MIX_TEMP"
mv -f "$MIX_TEMP" "$MIX"

echo "Remplacement de la piste audio du MP4, sans réencoder l’image…"
ffmpeg -hide_banner -loglevel warning -y \
  -i "$VIDEO" \
  -i "$MIX" \
  -map 0:v:0 -map 1:a:0 -map_metadata 0 \
  -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -t 80.5 -movflags +faststart \
  "$VIDEO_TEMP"
mv -f "$VIDEO_TEMP" "$VIDEO"

echo "Terminé : $VIDEO"
echo "Mix de lecture : $MIX"
echo "Version instrumentale conservée : $ARCHIVE"
