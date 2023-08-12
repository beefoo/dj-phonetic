# DJ Phonetic

Beatbox with historical speech.  Under construction, please do not use or share yet.

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

Place audio (.wav) and transcript (.txt) files in folder `./queue/`; respective audio and text should have the same name (except their file extensions). Some notes on the transcript file:

- The transcript should transcribe *exactly* what is in the audio
- Transcribe spoken non-verbals such as "um" or "ha", otherwise the transcript alignment may be off. However, you don't need transcribe non-spoken sounds like applause or background noise.
- When possible, avoid using abbreviations ("Mr." should be "mister")
- Spell out numerals ("16" should be "sixteen")

Run the following to align the transcripts:

```
npm run align

// or if you want to overwrite existing alignments:
npm run align-overwrite
```

Audio and alignment (.TextGrid) files should show up in the folders `./audio/` and `./audio/aligned/`. Optionally, you can edit the alignment files and place them in `./audio/edited/`. You can now safely remove the original audio and txt files from the queue folder.

Sometimes there are words (such as uncommon proper nouns) that do not exist in the phonetic dictionary (these are called "out of vocabulary" or OOV words). You can see if there are any OOV words by running

```
npm run validate-alignments
```

If you have any OOV words, you can manually add them to the dictionary file typically located at `/<User>/Documents/MFA/pretrained_models/dictionary/english_us_arpa.dict`. Simply add a new line to the dictionary and follow the [format described here](https://montreal-forced-aligner.readthedocs.io/en/latest/user_guide/dictionary.html#silence-probabilities). Then place the updated text file and associated audio file in the `./queue/` and run `npm run align-overwrite`.

Once the alignment files are finished, update `metadata.csv` with the appropriate fields. This data will be used in the user interface. Ingest the new data into the web app:

```
npm run ingest

// or if you want to overwrite existing files:
npm run ingest-clean
```

Now run the web server to view the app locally:

```
npm start
```

## Sources

- Transcript alignment: [Montreal Forced Aligner](https://montreal-forced-aligner.readthedocs.io/en/latest/index.html)
- Icon source: [Pixel Art Icons](https://icon-sets.iconify.design/pixelarticons/)
