---
title: Download
sidebar_label: Download
slug: /download
---

Zell ships as one self-contained archive per host. Every archive can cross-compile to every supported target, and nothing else is needed: no clang, no C library headers, no mingw-w64, no macOS SDK.

All archives, checksums and release notes are on the [releases page](https://github.com/zell-lang/zell/releases).

## Install

### Prebuilt toolchain

Archives are named `zell-<version>-<host>.tar.xz` (Windows also `.tar.gz`) and come with a `SHA256SUMS` file:

| Host | Archive |
|---|---|
| Linux x86-64 | `zell-<version>-linux-amd64.tar.xz` |
| Linux arm64 | `zell-<version>-linux-arm64.tar.xz` |
| macOS Apple Silicon | `zell-<version>-macos-arm64.tar.xz` |
| macOS Intel | `zell-<version>-macos-amd64.tar.xz` |
| Windows x86-64 | `zell-<version>-windows-amd64.tar.xz` / `.tar.gz` |

Each archive contains `bin/zell`, `bin/zell-lsp`, `bin/zell-mcp`, the linker `bin/lld`, `std/`, `targets/<triple>/` with the link inputs of every target, and `tools/` (debugger formatters, the VS Code client).

Release candidates (`v0.1.0-rc.N`) are published as GitHub *pre-releases*. A pre-release is never "latest", so the plain installer does not pick it up: ask for it by version.

### One line (Linux, macOS)

```sh
curl -fsSL https://raw.githubusercontent.com/zell-lang/zell/master/scripts/install.sh | sh
# a release candidate:
curl -fsSL https://raw.githubusercontent.com/zell-lang/zell/master/scripts/install.sh | sh -s -- --version 0.1.0-rc.3
```

`install.sh` downloads the archive for your host, checks its `.sha256`, unpacks it into `~/.zell/toolchain/zell-<version>-<host>/`, points `~/.zell/toolchain/current` at it and links `zell`, `zell-lsp` and `zell-mcp` into `~/.local/bin` (`--dir`, `--bin` and `$ZELL_BIN_DIR` change the places).

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/zell-lang/zell/master/scripts/install.ps1 | iex
.\install.ps1 -Version 0.1.0-rc.3        # a candidate, from a saved copy of the script
```

`install.ps1` does the same under `%USERPROFILE%\.zell\toolchain` and adds `bin\` to the user `PATH`.

### By hand

Download the archive and `SHA256SUMS`, check and unpack it, and put `bin/` on `PATH`:

```sh
sha256sum -c --ignore-missing SHA256SUMS      # macOS: shasum -a 256 -c
tar xf zell-0.1.0-rc.3-linux-amd64.tar.xz
export PATH="$PWD/zell-0.1.0-rc.3-linux-amd64/bin:$PATH"
zell doctor                                   # checks the linker and every target's link inputs
```

### macOS

The binaries are not signed yet. If Gatekeeper refuses to run them, remove the quarantine attribute from the unpacked directory:

```sh
xattr -dr com.apple.quarantine ~/.zell/toolchain/zell-0.1.0-rc.3-macos-arm64
```

### Notes

Linux executables (glibc) run on any system with glibc 2.31 or newer (Ubuntu 20.04+, Debian 11+, RHEL 9+); `--target linux-amd64-musl` produces fully static ones. `ZELL_LINKER=clang` links with the system clang instead. `zell target add <target>` downloads extra targets into `~/.zell/targets`.

## Your first program

```sh
zell init hello && cd hello    # zell.toml + src/main.zl
zell run                       # build and run the project
zell test                      # tests, benchmarks and examples (@test functions)
zell fmt                       # format in the canonical style (--check in CI)
zell build --release           # an optimized, stripped binary for this machine
zell build --release --target linux-arm64-musl   # cross-compile a static arm64 Linux executable
```

Continue with [Getting started](/guide/getting-started) and the [Tour of Zell](/guide/tour).

## From source

Building from source works on Linux x86-64 or arm64, macOS and (through MSYS2) Windows. See the [README of the language repository](https://github.com/zell-lang/zell#from-source) for the toolchain requirements (Rust, LLVM 18, clang and lld).

## Editors

Set up [VS Code](/editors/vscode), [IntelliJ IDEA and other JetBrains IDEs](/editors/idea), or any LSP-capable editor ([other editors](/editors/other)).
