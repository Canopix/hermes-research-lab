---
name: AI News Digest
description: Generate a weekly AI news digest covering research, open source, and industry
category: agenthub-template
params:
  - name: topics
    description: AI topics to cover
    type: text
    required: true
    default: ""
  - name: sources
    description: Extra sources to check
    type: text
    required: false
    default: ""
  - name: frequency
    description: Digest frequency
    type: select
    required: true
    options:
      - daily
      - every 12h
      - weekly
    default: weekly
  - name: language
    description: Output language
    type: select
    required: true
    options:
      - español
      - english
    default: español
tags:
  - ai
  - news
  - digest
  - weekly
---

Generate a weekly AI news digest. Follow these steps:

1) Search the web for major AI announcements, model releases, and research breakthroughs about: {topics}
2) Search for trending ML repos on GitHub
3) Check arXiv for relevant papers

**Digest structure:**

- **Headlines** (3-5 major stories)
- **Notable Papers** (2-3 with one-sentence summaries)
- **Open Source** (interesting repos/releases)
- **Industry Moves**

Keep each item 1-2 sentences with links. Total under 600 words.

If extra sources provided, include them too: {sources}

Execution frequency: {frequency}
Output language: {language}
