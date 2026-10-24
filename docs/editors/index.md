---
title: Editors
sidebar_label: Overview
sidebar_position: 0
slug: /editors
---

Zell has a language server, `zell-lsp` (diagnostics with quick fixes, navigation, rename, completion, signature help, inlay hints, code actions, semantic tokens, formatting, test and run code lenses), shipped in every toolchain archive. Editor support is built on it.

| Editor | Support |
|---|---|
| [Visual Studio Code](/editors/vscode) | extension with highlighting, `zell-lsp`, run/debug code lenses and debugging |
| [IntelliJ IDEA, GoLand, other JetBrains IDEs](/editors/idea) | the `zell-idea-plugin` (commercial IDEs: it uses the platform LSP API) |
| [Neovim, Helix, Zed, Sublime, Emacs](/editors/other) | register `zell-lsp` as the server for `*.zl` |

For the list of implemented protocol features see [LSP conformance](/design/lsp-conformance).
