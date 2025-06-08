#!/bin/sh
# Copyright 2019 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

set -e

if ! command -v unzip >/dev/null && ! command -v 7z >/dev/null; then
	echo "Error: either unzip or 7z is required to install Deno (see: https://github.com/denoland/deno_install#either-unzip-or-7z-is-required )." 1>&2
	exit 1
fi

if [ "$OS" = "Windows_NT" ]; then
	target="x86_64-pc-windows-msvc"
else
	case $(uname -sm) in
	"Darwin x86_64") target="x86_64-apple-darwin" ;;
	"Darwin arm64") target="aarch64-apple-darwin" ;;
	"Linux aarch64") target="aarch64-unknown-linux-gnu" ;;
	*) target="x86_64-unknown-linux-gnu" ;;
	esac
fi

print_help_and_exit() {
	echo "Setup script for installing deno

Options:
  -y, --yes
    Skip interactive prompts and accept defaults
  --no-modify-path
    Don't add deno to the PATH environment variable
  -h, --help
    Print help
"
	echo "Note: Deno was not installed"
	exit 0
}

# Initialize variables
should_run_shell_setup=false

# Simple arg parsing - look for help flag, otherwise
# ignore args starting with '-' and take the first
# positional arg as the deno version to install
for arg in "$@"; do
	case "$arg" in
	"-h")
		print_help_and_exit
		;;
	"--help")
		print_help_and_exit
		;;
	"-y")
		should_run_shell_setup=true
		;;
	"--yes")
		should_run_shell_setup=true
		;;
	"-"*) ;;
	*)
		if [ -z "$deno_version" ]; then
			deno_version="$arg"
		fi
		;;
	esac
done
if [ -z "$deno_version" ]; then
	deno_version="$(curl -s https://dl.deno.land/release-latest.txt)"
fi

deno_uri="https://dl.deno.land/release/${deno_version}/deno-${target}.zip"
deno_install="${DENO_INSTALL:-$HOME/.deno}"
bin_dir="$deno_install/bin"
exe="$bin_dir/deno"

if [ ! -d "$bin_dir" ]; then
	mkdir -p "$bin_dir"
fi

curl --fail --location --progress-bar --output "$exe.zip" "$deno_uri"
if command -v unzip >/dev/null; then
	unzip -d "$bin_dir" -o "$exe.zip"
else
	7z x -o"$bin_dir" -y "$exe.zip"
fi
chmod +x "$exe"
rm "$exe.zip"

echo "Deno was installed successfully to $exe"

run_shell_setup() {
	$exe run -A --reload jsr:@deno/installer-shell-setup/bundled "$deno_install" "$@"
}

# If stdout is a terminal, see if we can run shell setup script (which includes interactive prompts)
if { [ -z "$CI" ] && [ -t 1 ]; } || $should_run_shell_setup; then
	if $exe eval 'const [major, minor] = Deno.version.deno.split("."); if (major < 2 && minor < 42) Deno.exit(1)'; then
		if $should_run_shell_setup; then
			run_shell_setup -y "$@" # doublely sure to pass -y to run_shell_setup in this case
		else
			if [ -t 0 ]; then
				run_shell_setup "$@"
			else
				# This script is probably running piped into sh, so we don't have direct access to stdin.
				# Instead, explicitly connect /dev/tty to stdin
				run_shell_setup "$@" </dev/tty
			fi
		fi
	fi
fi
if command -v deno >/dev/null; then
	echo "Run 'deno --help' to get started"
else
	echo "Run '$exe --help' to get started"
fi
echo
echo "Stuck? Join our Discord https://discord.gg/deno"
