# Codetool
_CLI tools to help you work faster with your code!_

## Using Codetool
### Build and install
```sh
git clone https://github.com/nahkd123/codetool.git
cd codetool
npm run build
npm install -g .
# Use codetool to get started
```

> You need NodeJS and npm to install Codetool.

### Reproducing build
Codetool was initialized with `pnpm`, so you'll need to use `pnpm` to reproduce build from `pnpm-lock.yml`.

### Codetool Filler
Filler is a code generation tool. You can use Filler to generate code based on your templates.

There are 2 kinds of templates:
- In-source: These templates are located inside your source code. When you use `filler new`, it will insert generated code on top of your template (which is a comment block).
- Template file: These templates creates new files inside its parent directory.

In order to use Filler, you'll need to add `codetool.filler.json` at the project root. An example config file looks like this:

```json
{
    "mapping": [
        { "regex": ".+\\.txt$", "flags": "g", "mode": "in-source" },
        { "regex": ".+\\.template", "flags": "g", "mode": "file-template" }
    ]
}
```

- `mapping`: Configure how Filler search for files and help it figure out whether the file is your source code or template.
    - `regex`: The regular expression to match with the absolute file path (which is something like `/home/username/file.txt` or `C:\Users\username\Documents\file.txt`).
    - `flags`: The regular expression flags.
    - `mode`: The type of file. `in-source` will mark matching files as source code. `file-template` will mark matching files as template file.

In your source code, any occurences of comment block with its first line follows the `@template <template-id> [parameters-spec]` format will be treated as template:

```java
public class Main implements ModInitializer {
    @Override
    public void onInitialize() {
        /*
         * @template cosmetic id:snake
         * CosmeticsManager.register(new Identifier("modid", "${{ id.snake }}"), new ${{ id.pascal }}());
         */
    }
}
```

If you use `codetool filler new cosmetic id=my_cosmetic`, the generated code will be inserted above your template:

```java
@Override
public void onInitialize() {
    CosmeticsManager.register(new Identifier("modid", "my_cosmetic"), new MyCosmetic());
    // @template cosmetic id:snake ...
}
```

In your template file, you can write like this:

```
@template cosmetic id:snake
@use filename ${{ id.pascal }}.java
@endheader

package com.example;

import net.example.Cosmetic;

public class ${{ id.pascal }} implements Cosmetic {
    @Override
    public void initializeCosmetic() {
        // ...
    }
}
```

When run the command above, you'll get a new `MyCosmetic.java` file:

```java
package com.example;

import net.example.Cosmetic;

public class MyCosmetic implements Cosmetic {
    @Override
    public void initializeCosmetic() {
        // ...
    }
}
```

You might have noticed: there's a `:snake` after your parameter name. This is what we call "input parameter case specifier". If you don't specify the initial case, stuffs like `${{ param.pascal }}` will not work (in this case, it will not give you PascalCase version of your `param`).

There are x cases for identifiers that you can use:
- `PascalCase`: For Java class names and C# symbols.
- `snake_case`: For Rust, JSON and string IDs.
- `kebab-case`: For CSS.
- `camelCase`: For Java variable names.
- `CONSTANT_CASE`: For constant names.

## Copyright and License
(c) nahkd 2023. Licensed under MIT license.