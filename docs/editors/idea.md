---
title: IntelliJ IDEA and JetBrains IDEs
sidebar_label: IntelliJ IDEA
sidebar_position: 1
slug: /editors/idea
---

The [zell-idea-plugin](https://github.com/zell-lang/zell-idea-plugin) adds Zell to IntelliJ IDEA, GoLand and other JetBrains IDEs.

## Install

1. Download the plugin zip from its [releases](https://github.com/zell-lang/zell-idea-plugin/releases). Builds are versioned `YYYY.M.<build>`.
2. In the IDE open *Settings > Plugins*, click the gear icon, choose *Install Plugin from Disk* and select the zip.
3. Make sure `zell-lsp` from the [toolchain](/download) is on `PATH`.

A JetBrains Marketplace listing is planned.

## What it gives you

- Grammar-Kit PSI syntax highlighting, structure view and folding;
- LSP diagnostics, navigation, completion and rename through `zell-lsp`;
- formatting with `zell fmt`;
- run and test configurations are in progress.

:::note
The plugin hosts `zell-lsp` through the platform LSP API, which exists only in the **commercial** IDEs (IntelliJ IDEA Ultimate, GoLand and others). The free Community edition cannot run it.
:::
