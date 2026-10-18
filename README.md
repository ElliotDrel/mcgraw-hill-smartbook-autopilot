# BetterBook - McGraw-Hill SmartBook Automation

A Chrome extension that automatically works through McGraw-Hill SmartBook questions, remembers revealed answers, and optionally uses AI to answer new questions.

## What it does

- Read questions and answer choices on `learning.mheducation.com`.
- Select or enter answers, submit them, and advance through questions while the bot is enabled.
- Save revealed correct answers in your browser and reuse them when the same question appears again.
- Highlight saved answers and let you review them as flashcards in the popup.
- Use your own OpenAI API key for new multiple-choice, true/false, and fill-in-the-blank questions.
- Work without a key by guessing on unseen questions and learning from the answers shown afterward.

## Install and use

1. [Download the installation ZIP](https://github.com/ElliotDrel/Better-Book-Chrome-Extension/releases/latest) and extract it to a folder you will keep.
2. Open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select that folder.
3. Skip the optional API key or save your own key in the Settings page that opens. Open your McGraw-Hill assignment, then open BetterBook from Chrome's extensions menu to enable it.

- Open **Settings / optional AI key** from the popup anytime to add or remove a key.
- Use it without AI: it guesses on unseen questions and saves the revealed answers for later appearances.
- Add AI to attempt unseen multiple-choice, true/false, and fill-in-the-blank questions. Accuracy varies; no percentage is guaranteed.
- Pay OpenAI API charges on your own account when AI is enabled. Questions and answer choices go directly to OpenAI; the key is stored locally in your Chrome profile. No backend account is required.
- Refresh the assignment after installing or reloading the extension. If AI fails, the existing guessing mode takes over.

## Optional local environment setup

- Use Python 3 to run `python package.py` to produce a key-free ZIP in `dist/`.
- Copy `.env.example` to `.env`, set `OPENAI_API_KEY`, then run `python package.py --local` to create `dist/BetterBook-local/`. Load that folder in Chrome.
- Keep `.env` and local builds private. Chrome cannot read shell environment variables: the local build embeds the environment key in its ignored `config.js`. Public builds always use an empty default and never read `.env`.
- Prefer Settings for normal use; no Python, environment files, or source editing is required.

The repository contains a prebuilt popup; its original build project is not included. Run `node tests/check.cjs` and `python tests/check_package.py` for setup, key handling, AI fallback, and public-package checks. GitHub Actions runs these checks and publishes the key-free ZIP as a workflow artifact. JavaScript files are also syntax-checked with `node --check`.
