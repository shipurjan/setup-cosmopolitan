# setup-cosmopolitan

GitHub Action to setup Cosmopolitan toolchain on Linux, Windows and macOS.

## Usage

To setup it up, add a step to your GitHub workflow configuration :

```yaml
- uses: tritao/setup-cosmopolitan@v1.3
  with:
    version: '4.0.2'
```

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

You can also specify a custom URL for the cosmocc zip archive using the `url`
input. When using `url`, the `version` input is optional — if omitted, caching
is skipped and the archive is always downloaded fresh:

```yaml
- uses: tritao/setup-cosmopolitan@v1.3
  with:
    url: 'https://example.com/custom-cosmocc.zip'
```
