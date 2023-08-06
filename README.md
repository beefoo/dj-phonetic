# DJ Phonetic

Beatbox with historical speeches.  Under construction, please do not use or share yet.

## Intallation

```
// install conda forge and montreal forced aligner
conda install -c conda-forge montreal-forced-aligner

// download models and dictionary
mfa model download acoustic english_us_arpa
mfa model download dictionary english_us_arpa

// validate model
mfa model inspect acoustic english_us_arpa

// validate dataset
mfa validate audio english_us_arpa english_us_arpa
```

## Ingesting new audio

Place audio (e.g. .mp3, .wav) and transcript (.txt) files in folder `./audio/`; respective audio and text should have the same name (except their file extensions).

_Hint: transcript should transcribe *exactly* what is in the audio, including non-verbals such as "um" or "ha", otherwise the transcript alignment may be off_ 

Run the following to align the transcripts:

```
npm run align

// or if you want to overwrite existing alignments:
npm run align-clean
```

Then ingest the new data into the web app:

```
npm run ingest

// or if you want to overwrite existing files:
npm run ingest-clean
```

Now run the web server:

```
npm start
```

## Sources

- Transcript alignment: [Montreal Forced Aligner](https://montreal-forced-aligner.readthedocs.io/en/latest/index.html)
- Icon source: [Pixel Art Icons](https://icon-sets.iconify.design/pixelarticons/)
