# setup-cosmopolitan

GitHub Action to setup Cosmopolitan toolchain on Linux, Windows and macOS.

## Usage

To setup it up, add a step to your GitHub workflow configuration :

```yaml
- uses: shipurjan/setup-cosmopolitan@1f92831f1e4197d9ed52449de0f9d1efc2bdf04e
  with:
    version: '4.0.2'
```

The examples use a pinned commit hash instead of a branch or tag to ensure an
immutable reference — the code you run won't change unexpectedly.

Cosmopolitan toolchain is added to the path so you can run any cosmos commands
after. For example, to compile your project using `cosmocc`, add a step :

```yaml
- name: Compile my project
  run:
    - cosmocc -o hello hello.c
```

By default, Cosmopolitan toolchain is installed in `.cosmopolitan` directory
relative to the GitHub workspace. You can optionally change it using the `path`
input.

To use the latest nightly build from Cosmopolitan's CI:

```yaml
- uses: shipurjan/setup-cosmopolitan@1f92831f1e4197d9ed52449de0f9d1efc2bdf04e
  with:
    version: 'nightly'
```

Nightly builds are downloaded from the
[nightly-cosmocc](https://github.com/jart/cosmopolitan/actions/workflows/nightly-cosmocc.yml)
GitHub Actions workflow artifacts and require a GitHub token (provided
automatically via `github-token`). Nightly builds skip caching since they change
daily.

You can also specify a custom URL for the cosmocc zip archive using the `url`
input. When using `url`, the `version` input is optional — if omitted, caching
is skipped and the archive is always downloaded fresh:

```yaml
- uses: shipurjan/setup-cosmopolitan@1f92831f1e4197d9ed52449de0f9d1efc2bdf04e
  with:
    url: 'https://example.com/custom-cosmocc.zip'
```
