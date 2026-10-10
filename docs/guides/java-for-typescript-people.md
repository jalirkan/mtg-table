# Java for TypeScript people

*A primer for reading and changing `bridge/` — nothing more.*

You write TypeScript and Python. You have never written Java. This repo has
about 16,500 lines of it under `bridge/src`, and one day you are going to want to add a field to a
card, or find out why a frame is missing, or make the engine tell you something
it currently doesn't. This guide is exactly enough Java to do that, taught from
our own files, with no detours into Spring, Maven, dependency injection, or
anything else the internet will try to sell you when you search "Java tutorial".

Two promises up front:

- **Every code block here is copied from a real file in this repo**, with its
  path and line range. You can open the file and see it in context.
- **You never need to write Java from scratch.** Every change you will actually
  make is a small edit next to an existing line that already does something
  similar. The skill you need is *reading*, and the confidence to change one
  thing.

A third thing, less a promise than a warning: this repo is under active
hardening. A later pass may rename a method, split a class, or move a constant.
When this guide and the file disagree, **the file is right and this guide is
stale** — the line numbers especially. Treat the line ranges as "roughly here,
look for the shape", search for the distinctive string instead of trusting the
number, and if you find a drift worth fixing, fix the guide in a separate
commit from the code. Nothing in here is load-bearing for the build; it is
documentation about documentation.

---

## 1. The mental model

Java and TypeScript are cousins. Both have classes, interfaces, generics,
`extends`/`implements`, `new`, `this`, `try`/`catch`, and curly braces in
roughly the same places. The differences that will actually bite you are these:

| Thing | TypeScript | Java | What that means here |
|---|---|---|---|
| **Types** | Erased. A compile-time fiction; at runtime everything is a JS value. | Real. Every value carries its class at runtime; `instanceof` genuinely asks the object. | `Snap.event()` dispatches on `ev instanceof GameEventCardTapped` and that is a real, reliable question (`Snap.java:1705`). |
| **Where code lives** | Any file; export what you like. | **One public class per file, named exactly like the file.** `HeadlessGuiBase.java` must contain `public class HeadlessGuiBase`. | Renaming a class means renaming the file. |
| **Modules** | `import { x } from './y'` — paths. | `package mtgtable;` at the top, then `import forge.game.Game;` — **names**, resolved from the classpath, not from disk paths. | Our package is `mtgtable`, so our sources live at `bridge/src/mtgtable/*.java` and the class is `mtgtable.Smoke`. The directory structure *must* mirror the package name. |
| **Interfaces** | Structural. Any object with the right shape satisfies one. | **Nominal.** You must write `implements IGuiBase` and then implement *every* method, or it won't compile. | `HeadlessGuiBase` has ~45 methods because `IGuiBase` declares ~45. Most are one-liners returning `null`. |
| **Classes** | Optional sugar. | The only way to organise code. Even a bag of functions is a class with `static` methods. | `Smoke`, `Snap`, `Json` are all "no instances, just functions" classes — hence `private Smoke() { }` (`Smoke.java:60`), a constructor nobody can call. |
| **`static`** | Rare. | Everywhere. `static` = belongs to the class, not to an instance. It's the closest thing to a module-level function. | `Snap.state(...)` is called on the class: no `new Snap()` anywhere. |
| **`final`** | `const` (for bindings) / `readonly` (for fields). | Same idea: this binding/field is assigned once. We mark nearly everything `final` as a discipline. | `final Deck deck = ...` reads as `const deck = ...`. `public final class Snap` additionally means "nobody may subclass this". |
| **`null`** | `strictNullChecks` makes it a type. `string \| null`. | **Every reference can be `null` and the compiler does not care.** Dereferencing it throws `NullPointerException` at runtime. | This is why our code is full of `x == null ? null : x.getId()`. That is not paranoia; it's the only null-safety we get. |
| **Optional chaining** | `a?.b?.c` | Doesn't exist. Write the `if` or the ternary. | `o.n("phase", game.getPhase() == null ? null : game.getPhase().name())` (`Snap.java:157`). |
| **Generics** | `Array<T>`, erased. | `List<T>`, also erased at runtime, but enforced strictly at compile time and *invariant*. | `List<CardView>` is not a `List<Object>`. `<T> List<T> order(...)` (`HeadlessGuiBase.java:279`) declares a method-level type variable, same as TS. |
| **Exceptions** | Anything can be thrown; nothing is declared. | Two flavours: **unchecked** (`RuntimeException` and friends — behave like JS) and **checked** (`IOException` — the compiler forces you to `catch` it or declare `throws`). | `GameLog`'s constructor says `throws IOException` (`GameLog.java:92`) so every caller must handle it. `IllegalStateException` is unchecked, which is why `Snap.assertGameThread` can throw it from anywhere. |
| **`throws` in a signature** | n/a | "This method may throw this checked exception; deal with it." Not a return type. | `private static void run(...) throws Exception` (`RecordMatch.java:151`) is "I give up, `main` will catch it". |
| **Async** | `async`/`await`, one event loop, no shared memory. | **Real OS threads, shared mutable memory, no `await`.** Concurrency is `synchronized`, `volatile`, queues and executors. | This is the single biggest conceptual jump, and section 3 is about it. |
| **Compile & run** | `tsc` emits JS; or Node strips types and runs the source. | `javac` emits `.class` bytecode files; `java` loads them into the JVM. **Two separate steps, always.** | `bridge/build.sh` then `bridge/run.sh`. Editing a `.java` file changes nothing until you rebuild. |
| **Dependencies** | `node_modules`, resolved by path at runtime. | A **classpath**: a list of directories and `.jar` files the JVM searches for class *names*. | Ours is exactly two entries: `bridge/out` (our code) and the Forge fat jar (everything else). |
| **A `.jar`** | n/a | A ZIP file full of `.class` files. A "fat jar" has all its dependencies zipped in too. | Forge's is 39 MB and contains Forge, Guava, Jetty, Netty, and ~15,000 other classes. |
| **Package manager** | npm | Maven/Gradle — **which we do not use.** | There is no Maven coordinate for Forge. We compile against a jar on disk, by path. See section 2. |
| **Type at the front** | `const x: string = "hi"` | `final String x = "hi";` — type first, then name. | `final GameView gameView = game.getView();` |
| **`var`** | old JS keyword | Since Java 10, `var x = ...` means "infer the type", exactly like TS's `const`. | We mostly don't use it; explicit types are easier to read when you're learning the Forge API. |
| **String building** | Template literals | `+` concatenation, or `StringBuilder` in a loop. | `Json.JsonOut` is a `StringBuilder` wrapper; see section 5. |
| **Enums** | Unions of literals, mostly. | Real objects. `ZoneType.Library` is a singleton with methods; `.name()` gives the declared name as a `String`. | `game.getPhase().name()` turns a `PhaseType` into `"MAIN1"`. |

### Five syntax notes that unlock most of the code

**1. Annotations** — `@Override`, `@Subscribe`, `@SuppressWarnings("unchecked")`.
These are metadata on the next declaration, like a TS decorator but usually
inert. `@Override` means "I am replacing a method from my parent or interface";
the compiler checks you actually are, which catches typos. That's its whole job.

**2. The for-each loop.** `for (final CardView cv : cards)` is `for (const cv of
cards)`. It works on anything `Iterable`.

**3. `instanceof` with a binding** — this is Java 16+ and reads oddly at first:

```java
// bridge/src/mtgtable/Snap.java:1705-1706
} else if (ev instanceof GameEventCardTapped e) {
    o.obj().n("kind", "tap").n("cardId", e.card().getId()).n("tapped", e.tapped()).end();
```

`ev instanceof GameEventCardTapped e` both *tests* the type and, if true, binds
the narrowed value to a new variable `e`. It is TypeScript's type narrowing,
made explicit.

**4. Lambdas and method references.** `r -> { ... }` is `(r) => { ... }`.
`Integer::sum` is `(a, b) => a + b` — a method reference. `this::drain` is
`() => this.drain()`. You'll see all three.

**5. Inner classes.** A class declared inside another class. `Smoke.Watcher`
(`Smoke.java:355`) is `private static final class Watcher` — a helper that only
`Smoke` uses. `static` here means "does not secretly hold a reference to the
outer object", which is what you almost always want. In the compiled output it
becomes a separate file, `Smoke$Watcher.class`.

---

## 2. How our build works, without Maven

### The situation

This machine has an OpenJDK 21 **JRE**, not a JDK. That means: there is a `java`
binary but **no `javac` binary**. There is also no Maven and no Gradle, and
installing them wouldn't help, because Forge does not publish to Maven Central —
`forge:forge-game:2.0.14` will never resolve for anyone, ever.

So we do the simplest possible thing: compile our nine files against the jar on
disk, into a directory, and run them with that same jar on the classpath.

### What a jar is, and what the classpath is

A **jar** is a ZIP archive of `.class` files, organised by package. Forge ships
a *fat* jar — `forge-gui-desktop-2.0.14-jar-with-dependencies.jar`, 39,383,858
bytes — which contains not just Forge but every library Forge depends on. That's
why we can write `import com.google.common.collect.Multimap;` (Google Guava) and
`import org.eclipse.jetty.util.ajax.JSON;` (Jetty) in `Snap.java` and
`Config.java` without installing anything: they're already inside that one file.

The **classpath** is the list of places the JVM looks up a class *name*. It is
not a module system and there is no resolution algorithm — it is a search path,
first match wins. Ours has exactly two entries:

```bash
# bridge/run.sh:51
  -cp "$REPO_ROOT/bridge/out:$FORGE_JAR" \
```

`bridge/out` is our compiled code; the jar is everything else. If a class isn't
in one of those two, you get `ClassNotFoundException` at runtime — or, at
compile time, `cannot find symbol`.

Mentally: `-cp` is `node_modules` plus your `dist/`, collapsed into one
colon-separated string that you pass by hand.

### Why `java -m jdk.compiler/...` compiles

Here is the actual compile:

```bash
# bridge/build.sh:45-49
java -m jdk.compiler/com.sun.tools.javac.Main \
     -cp "$FORGE_JAR" \
     -d "$OUT" \
     -Xlint:all \
     "${SOURCES[@]}"
```

The trick: `javac` the *binary* is just a thin launcher around a Java class,
`com.sun.tools.javac.Main`, which lives in the `jdk.compiler` module. A JRE
image still ships that module even though it doesn't ship the launcher script.
`java -m <module>/<class>` means "run this class's `main` from this module", so
this line *is* javac, spelled the long way.

The flags:

- `-cp "$FORGE_JAR"` — compile against Forge. Without it, every `import
  forge.*` fails.
- `-d "$OUT"` — put `.class` files here, creating package subdirectories.
- `-Xlint:all` — turn on every compiler warning. We keep the build clean.
- and then the list of `.java` files, gathered by `find`.

**Never add `--release`.** A JRE image has no `ct.sym` (the historical-API
database), so `--release 17` fails with "release version 17 not supported". The
comment at `build.sh:10-13` says exactly this. Plain `javac` emits Java 21
bytecode, which the Java 21 that will run it is perfectly happy with.

### What `bridge/out` contains

After a build:

```
bridge/out/mtgtable/Config.class
bridge/out/mtgtable/HeadlessGuiBase.class
bridge/out/mtgtable/Json.class
bridge/out/mtgtable/Json$JsonOut.class
bridge/out/mtgtable/Smoke.class
bridge/out/mtgtable/Smoke$Watcher.class
bridge/out/mtgtable/Snap.class
...
```

One `.class` per class — including inner classes, which get a `Outer$Inner`
name. The directory `mtgtable/` exists because the package is `mtgtable`; the
JVM finds `mtgtable.Smoke` by looking for `mtgtable/Smoke.class` under each
classpath entry. That's the whole mechanism. `bridge/out` is a build artifact:
deleting it costs you one `./bridge/build.sh`.

### The self-test wired into the build

`build.sh` doesn't stop at compiling. It does two more things, and both are
worth knowing about because they can fail *your* build:

```bash
# bridge/build.sh:32-36
if grep -rn --include='*.java' 'getDecks()' "$SRC" 2>/dev/null \
     | grep -vE ':[[:space:]]*(//|\*|/\*)'; then
  echo "ERROR: FModel.getDecks() is banned in bridge/ -- it renames and moves the user's .dck files." >&2
  exit 1
fi
```

A grep-based lint. `FModel.getDecks()` reaches code that *renames the user's
real deck files and deletes the ones it can't parse*. It is banned. (The second
grep lets the ban be *discussed* in comments — like this paragraph — without
tripping itself.) Today the lint is `tools/lint-bridge.sh`, over `bridge/src`
and `tools/`, and `tools/lint-bridge-selftest.sh` runs just before it: it plants
a snippet for every rule in a scratch copy and fails the build unless each rule
fires on its own snippet (D180). A rule nobody has seen fail may be a rule that
cannot — two of them couldn't.

And after the compile:

```bash
# bridge/build.sh:56
java -Dfile.encoding=UTF-8 -cp "$OUT:$FORGE_JAR" mtgtable.JsonSelfTest
```

There is no JUnit on this machine, so the unit test for `Json.java` is a class
with a `main` that prints failures and exits non-zero. Run on every build. If
you break the JSON writer, the build fails — not a fixture three hundred frames
later.

### And running

```bash
# bridge/run.sh:44-52
exec env -u DISPLAY java \
  -Xmx4096m \
  -Djava.awt.headless=true \
  -Dio.netty.tryReflectionSetAccessible=true \
  -Dfile.encoding=UTF-8 \
  -Dsentry.uncaught.handler.enabled=false \
  -Dmtgtable.config="$REPO_ROOT/config.json" \
  -cp "$REPO_ROOT/bridge/out:$FORGE_JAR" \
  "$@"
```

`-D<name>=<value>` sets a **system property** — a JVM-global key/value string
map, read back with `System.getProperty("mtgtable.config")` (see
`Config.java:62`). It's the JVM's answer to an environment variable, and
libraries use it for configuration. The three you should recognise:

- `-Djava.awt.headless=true` — "there is no screen"; makes the graphics
  subsystem refuse politely instead of crashing.
- `-Dsentry.uncaught.handler.enabled=false` — **load-bearing.** Forge bundles
  Sentry, which installs a global uncaught-exception handler that swallows your
  stack trace and leaves a silent `exit 1`. Without this flag you cannot debug a
  boot failure at all.
- `-Dmtgtable.config=...` — how our own `Config` finds `config.json` without
  anything being hardcoded in Java.

`env -u DISPLAY` unsets `DISPLAY` so the run is provably headless, and `exec`
replaces the shell process with the JVM so signals and exit codes pass straight
through.

---

## 3. Reading `HeadlessGuiBase.java`

`bridge/src/mtgtable/HeadlessGuiBase.java` — 341 lines, of which maybe 25 do
anything. It is the best first file to read because it teaches interfaces and
threads at the same time, with very little Magic in the way.

### What `implements IGuiBase` means

```java
// bridge/src/mtgtable/HeadlessGuiBase.java:103
public final class HeadlessGuiBase implements IGuiBase {
```

`IGuiBase` is a Forge interface — a list of about 45 method signatures with no
bodies. Forge's desktop app implements it with Swing; the mobile port
implements it with libGDX; we implement it with "no".

In TypeScript you'd write:

```ts
const gui: IGuiBase = {
  isRunningOnDesktop: () => true,
  getAssetsDir: () => assetsDir,
  // ...
};
```

...and TS would check the shape. Java is **nominal**, not structural: an object
satisfies `IGuiBase` only if its class *says* `implements IGuiBase`, and then
the compiler requires a body for every single declared method. No optional
members, no partial implementations. That is why this file is 341 lines to do
almost nothing: the length is the interface's, not ours.

Forge holds exactly one of these, globally, and asks it questions:

```java
// bridge/src/mtgtable/Smoke.java:130-131
final HeadlessGuiBase gui = new HeadlessGuiBase(forgeHome);
GuiBase.setInterface(gui);
```

`GuiBase` is a static holder — a global variable with a setter. Setting it is
the first Forge call in any of our processes, and section 6 explains why it
*has* to be.

### Why most methods are empty

Read a few:

```java
// bridge/src/mtgtable/HeadlessGuiBase.java:260-266
@Override public ImageFetcher getImageFetcher() { return null; }

@Override public ISkinImage getSkinIcon(final FSkinProp skinProp) { return null; }

@Override public ISkinImage getUnskinnedIcon(final String path) { return null; }

@Override public ISkinImage getCardArt(final PaperCard card, final boolean backFace) { return null; }
```

There is no skin, so every skin question answers `null`. There is no sound, so
`createAudioClip` returns `null`. There is no clipboard and no browser, so
`copyToClipboard` and `browseToUrl` have empty bodies. These aren't stubs
waiting to be filled in — they are the *correct* answers for a process with no
screen. The file groups them under banner comments (`// Images and skin`,
`// Sound -- silent`, `// Quest-mode shells`) precisely so you can skip them.

Two are subtler and worth noticing, because they show a pattern you'll reuse:

```java
// bridge/src/mtgtable/HeadlessGuiBase.java:333-345
/** Identity: keep the order the engine proposed. */
@Override public <T> List<T> order(final String title, final String top,
                                   final int remainingObjectsMin, final int remainingObjectsMax,
                                   final List<T> sourceChoices, final List<T> destChoices) {
    return destChoices;
}

/** Identity: accept whatever the engine pre-selected. */
@Override public <T> List<T> getChoices(final String message, final int min, final int max,
                                        final Collection<T> choices, final Collection<T> selected,
                                        final FSerializableFunction<T, String> display) {
    return new ArrayList<>(selected);
}
```

`<T>` before the return type declares a type variable scoped to this method —
identical to TS's `function order<T>(...): T[]`. The bodies are *identity*
functions: "whatever you proposed, that's my answer." A headless process can't
ask anyone, so the safe default is to accept the engine's own suggestion rather
than throw. When the browser exists (M2+), the equivalents on the *in-game*
interface will actually ask it; these lobby-level ones stay identity forever.

### The single-thread executor

Now the 25 lines that matter.

```java
// bridge/src/mtgtable/HeadlessGuiBase.java:170-175
/** Single thread, named, daemon, so a wedged task cannot keep the JVM alive. */
private final ExecutorService edt = Executors.newSingleThreadExecutor(r -> {
    final Thread t = new Thread(r, EDT_NAME);
    t.setDaemon(true);
    return t;
});
```

Unpacking it:

- `ExecutorService` is a queue with worker threads attached. You hand it a
  `Runnable` (a zero-argument function) and it runs it on one of its threads.
- `newSingleThreadExecutor` means **exactly one** worker, so tasks run one at a
  time, in submission order.
- The lambda `r -> { ... }` is a *thread factory*: it's called once, when the
  executor needs its thread, and we use that hook to give the thread a name and
  mark it a daemon (daemon threads don't keep the JVM alive at exit).

**The TypeScript analogy**, and it's a good one: a single-thread executor is a
serialised task queue — the closest Java gets to JavaScript's event loop. Three
differences you must hold onto:

1. It is a *real* thread, running in parallel with everything else. JS has one
   loop; here there are several, and this is just one of them.
2. There's no `await` on the calling side by default — submitting is
   fire-and-forget unless you explicitly block on the returned `Future`.
3. Its thread has a *name*, and in this project the name is load-bearing.

Which brings us to:

```java
// bridge/src/mtgtable/HeadlessGuiBase.java:110
public static final String EDT_NAME = "mtg-table-EDT";

// bridge/src/mtgtable/HeadlessGuiBase.java:138-141
/** True when the calling thread is our stand-in EDT. */
public static boolean onEdt() {
    return EDT_NAME.equals(Thread.currentThread().getName());
}

// bridge/src/mtgtable/HeadlessGuiBase.java:198-199
/** MUST NOT be a constant -- see the class javadoc. */
@Override public boolean isGuiThread() { return onEdt(); }
```

EDT stands for Event Dispatch Thread — Swing's name for the one thread allowed
to touch the UI. Forge, a desktop app, assumes one exists. We don't have Swing,
so we supply a stand-in: one thread, named `mtg-table-EDT`, and `isGuiThread()`
answers by *asking which thread is calling right now*.

Why not just `return true`? Because Forge uses the answer in both directions:

```java
// forge-gui/src/main/java/forge/gui/FThreads.java:15-23 (Forge source, read as prose)
public static void assertExecutedByEdt(final boolean mustBeEDT) {
    if (GuiBase.isNetPlay(null))
        return; //don't check for networkplay
    if (isGuiThread() != mustBeEDT) {
        ...
        throw new IllegalStateException(methodName + modalOperator + " accessed from the event dispatch thread.");
    }
}
```

Blocking input calls open with `assertExecutedByEdt(false)` — "you had better
*not* be the GUI thread, because I'm about to block and if I block the GUI
thread everything deadlocks." A constant `true` therefore throws
`IllegalStateException` at the very first mulligan prompt. The class javadoc at
`HeadlessGuiBase.java:61-82` tells that story with the exact exception text.

Note `EDT_NAME.equals(...)` and not `... == EDT_NAME`. In Java, `==` on objects
compares *identity* (are these the same object), and `.equals()` compares
*value*. For strings you almost always want `.equals()`. Writing the constant
first — `EDT_NAME.equals(x)` rather than `x.equals(EDT_NAME)` — also means it
can't throw if `x` is null. Both are Java idioms worth absorbing.

### The three dispatch methods

```java
// bridge/src/mtgtable/HeadlessGuiBase.java:226-245
@Override public void invokeInEdtNow(final Runnable proc) { proc.run(); }

@Override public void invokeInEdtLater(final Runnable proc) { edt.execute(proc); }

@Override public void invokeInEdtAndWait(final Runnable proc) {
    if (onEdt()) {
        // Dispatching to a single-thread executor from that same thread and
        // then waiting for it is a guaranteed deadlock.
        proc.run();
        return;
    }
    try {
        edt.submit(proc).get();
    } ...
}
```

- `invokeInEdtNow` — run it here, right now. Forge only calls this once it has
  already established the caller *is* the GUI thread.
- `invokeInEdtLater` — `edt.execute(proc)` queues it. Like `queueMicrotask`.
- `invokeInEdtAndWait` — queue it **and block until it's done**.
  `edt.submit(proc)` returns a `Future`, and `.get()` waits for it. A `Future`
  is a Promise you block on rather than await.

The `if (onEdt())` guard is the interesting line. If you're *already* on the
single worker thread and you submit a task to that same single-worker queue and
then wait for it, the worker is blocked waiting for itself: deadlock, forever,
with no error message. The guard runs the task inline instead. This is the
shape of bug that thread-name checks exist to prevent, and you will meet it
again.

One last piece:

```java
// bridge/src/mtgtable/HeadlessGuiBase.java:247-251
@Override public void runBackgroundTask(final String message, final Runnable task) {
    final Thread t = new Thread(task, BG_NAME);
    t.setDaemon(true);
    t.start();
}
```

`BG_NAME` is `"mtg-table-bg"` and, per the comment at line 93-98, is
**deliberately not** named `Game...`-anything — because Forge's
`ThreadUtil.isGameThread()` is literally:

```java
// forge-core/src/main/java/forge/util/ThreadUtil.java:51-53 (Forge source)
public static boolean isGameThread() {
    return Thread.currentThread().getName().startsWith("Game");
}
```

A string prefix test. That is the entire mechanism protecting the rules engine's
data structures, in this project and in Forge itself. Name a thread `Gamepad`
and you have just told Forge it may walk the view graph.

---

## 4. `Smoke.java`, top to bottom

`bridge/src/mtgtable/Smoke.java` is M0: boot the engine, load the deck, play one
AI-vs-AI game, print what happened. It's our "does it work at all" program and
the best place to learn what the Forge calls actually do. Here it is in order,
with one sentence per engine call.

### The class shell

```java
// bridge/src/mtgtable/Smoke.java:56-58
public final class Smoke {

    private Smoke() { }
```

`final` — nobody may subclass it. `private Smoke() { }` — a constructor nobody
can call, so nobody can write `new Smoke()`. Together they say "this is a
namespace for `static` functions, not a type". You'll see the same two lines at
the top of `Snap`, `Json` and `Config`. It's the Java way of writing a module.

### `main`

```java
// bridge/src/mtgtable/Smoke.java:93-115
public static void main(final String[] args) {
    final long t0 = System.nanoTime();

    // Tee stdout/stderr through a line scanner before Forge says anything.
    final Watcher outWatch = install(true);
    final Watcher errWatch = install(false);

    try {
        run(args, t0);
    } catch (final Throwable e) {
        ...
        System.exit(1);
    }
    report(outWatch, errWatch);
    System.exit(0);
}
```

`public static void main(String[] args)` is the fixed signature of a Java entry
point — the JVM looks for exactly this. `./bridge/run.sh mtgtable.Smoke` names
the class; the JVM finds its `main` and calls it with the remaining arguments.

`catch (final Throwable e)` catches *everything*, including errors you normally
wouldn't (like `OutOfMemoryError`). Broad catches are usually bad practice; here
it's deliberate, because the one thing this program must never do is die
silently.

`System.exit(0)` at the end is also deliberate: Forge leaves daemon thread pools
running, and without an explicit exit the JVM would sit there. The comment at
line 99-101 says so.

### Setup

```java
// bridge/src/mtgtable/Smoke.java:118-120
final Config cfg = Config.load();
final String forgeHome = cfg.forgeHomeDir();
final File deckFile = args.length > 0 ? new File(args[0]).getAbsoluteFile() : cfg.deck();
```

`Config.load()` reads `config.json` — via the `mtgtable.config` system property
that `run.sh` set — so no path is ever hardcoded in Java. `args.length > 0 ? ...
: ...` is the ternary you already know; `File` is Java's path object (a value,
not an open file handle).

### 1. Install the GUI, first, before anything

```java
// bridge/src/mtgtable/Smoke.java:130-131
final HeadlessGuiBase gui = new HeadlessGuiBase(forgeHome);
GuiBase.setInterface(gui);
```

**`GuiBase.setInterface(...)` must be the first Forge call in the process.**
`ForgeConstants` is a class full of `static final` path constants, and its class
initialiser calls `GuiBase.getInterface().getAssetsDir()` to compute them. Java
runs a class initialiser the first time anyone touches that class — so reading
*any* `ForgeConstants` field before this line means calling `getAssetsDir()` on
`null`, which surfaces as `ExceptionInInitializerError` caused by
`NullPointerException`, permanently, for the life of the JVM.

```java
// bridge/src/mtgtable/Smoke.java:148-155
System.out.println("ASSETS_DIR    = " + ForgeConstants.ASSETS_DIR);
...
assertUnderRepo(cfg, "USER_DIR", ForgeConstants.USER_DIR);
```

Reading them *now* is safe, and it triggers the initialiser that reads
`forge-home/forge.profile.properties`. The four `assertUnderRepo` calls are the
proof that Forge will write into `var/` and not into the user's real `~/.forge`.
That check is not decoration — a wrong profile file means Forge renames the
user's actual decks.

### 2. Initialise the model

```java
// bridge/src/mtgtable/Smoke.java:152-155
final long tInit = System.nanoTime();
FModel.initialize(null, null);
final long initMs = ms(tInit);
System.out.println("FModel.initialize took " + initMs + " ms");
```

`FModel.initialize(null, null)` is Forge's big bang: it loads preferences,
parses every card script in `res/cardsfolder` into the card database, and loads
the AI profiles. Both arguments may be `null` (no progress bar, no preference
overrides). It takes a few seconds and creates Forge's profile directories —
which is exactly why the `assertUnderRepo` checks come *before* it.

```java
// bridge/src/mtgtable/Smoke.java:172-174
final int printings = FModel.getMagicDb().getCommonCards().getAllCards().size();
final int uniqueCards = FModel.getMagicDb().getCommonCards().getUniqueCards().size();
System.out.println("cards in DB = " + printings + " printings, " + uniqueCards + " unique");
```

`FModel.getMagicDb()` hands back the loaded card database; `getAllCards()` is
every printing (the same card in three sets counts three times) and
`getUniqueCards()` is every distinct name. Printing both is a cheap assertion
that the database actually loaded.

### 3. The deck

```java
// bridge/src/mtgtable/Smoke.java:183-189
final Deck deck = DeckSerializer.fromFile(deckFile);
if (deck == null) {
    throw new IllegalStateException("DeckSerializer.fromFile returned null for " + deckFile);
}
final int deckSize = deck.getMain().countAll();
System.out.println("deck from file = " + deck.getName() + " (" + deckSize + " cards, "
        + deck.getMain().countDistinct() + " distinct)");
```

`DeckSerializer.fromFile(File)` parses one `.dck` file into a `Deck` and does
nothing else — no directory scan, no renaming, no deletion. It is the **only**
sanctioned way to load a deck here; the alternative (`FModel.getDecks()`)
rewrites the user's files, which is why `build.sh` greps for it.

`deck.getMain()` is the main deck as a `CardPool` — a multiset of `PaperCard` to
count. `.countAll()` sums the counts (40); `.countDistinct()` counts entries.

Returning `null` on failure rather than throwing is very common in older Java
APIs, and it's why the explicit `if (deck == null)` check has to be there.

### The `auditDeck` loop — your model for iterating Forge collections

```java
// bridge/src/mtgtable/Smoke.java:284-293
final Map<String, Integer> bySet = new LinkedHashMap<>();
final List<String> unsupported = new ArrayList<>();
for (final Map.Entry<forge.item.PaperCard, Integer> e : deck.getMain()) {
    final forge.item.PaperCard pc = e.getKey();
    final String set = pc.getEdition() == null ? "(none)" : pc.getEdition();
    bySet.merge(set, e.getValue(), Integer::sum);
    if (pc.getRules() == null || pc.getRules().isUnsupported()) {
        unsupported.add(pc.getName() + " [" + set + "]");
    }
}
```

Five things to notice, because this ten-line loop is a compendium:

- `new LinkedHashMap<>()` — the `<>` is the "diamond", meaning "infer the type
  parameters from the left-hand side". `LinkedHashMap` preserves insertion
  order; plain `HashMap` doesn't.
- `for (final Map.Entry<PaperCard, Integer> e : deck.getMain())` — a `CardPool`
  iterates as entries of card → count. `e.getKey()`, `e.getValue()`.
- `forge.item.PaperCard` written out in full: `PaperCard` is *not* in Smoke's
  import list, so it must be fully qualified. Either style works; this file
  chose "don't add an import for one method".
- `bySet.merge(set, e.getValue(), Integer::sum)` — "put this value, or combine
  with what's there using this function". `Integer::sum` is a method reference,
  i.e. `(a, b) => a + b`. This is the Java idiom for `counts[k] = (counts[k] ??
  0) + n`.
- `pc.getRules() == null || pc.getRules().isUnsupported()` — the null check
  comes first, because `||` short-circuits exactly as in JS. Without it, a null
  `getRules()` is an NPE.

The comment above this method (`Smoke.java:249-270`) explains *why* the audit
exists, and it is the best single example in the repo of how this codebase
reasons: Forge silently drops unsupported cards from your deck, both ends of the
notification path are no-ops, there is no stderr line to grep for — so we apply
the same predicate ourselves rather than trusting a text search.

### 4. Rules and seats

```java
// bridge/src/mtgtable/Smoke.java:201-211
final GameRules rules = new GameRules(GameType.Constructed);
rules.setAppliedVariants(EnumSet.of(GameType.Constructed));
rules.setGamesPerMatch(1);

final List<RegisteredPlayer> players = new ArrayList<>();
final RegisteredPlayer p1 = new RegisteredPlayer(deck);
p1.setPlayer(GamePlayerUtil.createAiPlayer("AI-One", 0));
players.add(p1);
final RegisteredPlayer p2 = new RegisteredPlayer(deck);
p2.setPlayer(GamePlayerUtil.createAiPlayer("AI-Two", 1));
players.add(p2);
```

- `new GameRules(GameType.Constructed)` — the format. `GameType` is an enum.
- `rules.setAppliedVariants(EnumSet.of(GameType.Constructed))` — the variant
  list (Commander, Planechase, …); ours contains just the base format.
  `EnumSet.of(...)` is a `Set` specialised for enums.
- `rules.setGamesPerMatch(1)` — best-of-one, no sideboarding.
- `new RegisteredPlayer(deck)` — a seat with a deck in it.
- `GamePlayerUtil.createAiPlayer(name, index)` — builds a `LobbyPlayer` backed
  by an AI profile; the index selects which profile from `res/ai/`.
- `p1.setPlayer(...)` — attaches that lobby player to the seat.

The comment at line 186-187 is the important API insight: **you never construct
a `PlayerController`.** You set a `LobbyPlayer` on a `RegisteredPlayer`, and the
engine builds the matching controller (AI or human) for you. When M2 adds a
human seat, that is the line that changes.

### 5. Play it

```java
// bridge/src/mtgtable/Smoke.java:218-230
final Match match = new Match(rules, players, "mtg-table");
final Game game = match.createGame();
final long tGame = System.nanoTime();
long gameMs;
try {
    match.startGame(game);
} finally {
    gameMs = ms(tGame);
    game.setGameOver(GameEndReason.Draw);
}
```

- `new Match(rules, players, title)` — a match (possibly several games).
- `match.createGame()` — builds one `Game`: zones, libraries, the whole state.
- `match.startGame(game)` — **runs the entire game to completion, blocking**.
  For two AI seats this returns when someone has won. No callbacks, no await:
  the call simply takes a few seconds and then the game is over.
- `try { ... } finally { ... }` — `finally` runs whether or not the body threw.
- `game.setGameOver(GameEndReason.Draw)` — a belt-and-braces cleanup that is a
  no-op if the game already ended normally; it only matters on a crash path.

Smoke runs `startGame` on the `main` thread, which is fine here **because
nothing in Smoke takes a snapshot.** `RecordMatch` cannot do that — see section
6, rule 3.

### 6. Results

```java
// bridge/src/mtgtable/Smoke.java:236-248
final GameOutcome outcome = game.getOutcome();
final int turns = game.getPhaseHandler().getTurn();
if (outcome == null) {
    System.out.println("RESULT: no outcome recorded");
} else {
    final String winner = outcome.isDraw() || outcome.getWinningLobbyPlayer() == null
            ? "(draw)" : outcome.getWinningLobbyPlayer().getName();
    ...
}
```

- `game.getOutcome()` — who won and why, or `null` if nothing was recorded.
- `game.getPhaseHandler().getTurn()` — the turn counter. It counts **player**
  turns, so a game Forge's log calls "Turn 9" reports 17 or 18 here; the
  `(turns + 1) / 2` at line 240 converts to rounds.
- `game.getGameLog().getLogEntries(GameLogEntryType.MATCH_RESULTS)` (line 241) —
  Forge's own human-readable game log, filtered to the result lines.

### The `Watcher` — an inner class worth reading

`Smoke.java:337-430` is the one genuinely clever part of this file, and it is a
tidy tour of Java I/O. `install()` replaces `System.out` with a `PrintStream`
wrapping a custom `OutputStream` that (a) passes every byte through untouched
and (b) reassembles lines and records the ones matching a needle:

```java
// bridge/src/mtgtable/Smoke.java:471-481
@Override public synchronized void write(final int b) throws IOException {
    out.write(b);
    consume((byte) b);
}

@Override public synchronized void write(final byte[] b, final int off, final int len) throws IOException {
    out.write(b, off, len);
    for (int i = off; i < off + len; i++) {
        consume(b[i]);
    }
}
```

`extends OutputStream` and override `write` — that's the whole extension point;
Java streams are byte sinks with two methods that matter. `synchronized` on a
method means "only one thread inside this object's methods at a time", which
matters because Forge writes to stdout from several threads.

And note the self-match trap, handled at `Smoke.java:321-322`: `report()` stops
the watchers *before* printing the summary, because the summary names the
needles and would otherwise match itself. That kind of care is characteristic of
this codebase.

---

## 5. The hard part of `Snap.java`

`bridge/src/mtgtable/Snap.java` turns Forge's live view graph into the `state`
JSON that the browser reducer consumes. It is the most security-relevant file in
the repo, and it has exactly one idea you must not break.

### One card function, one gate

```java
// bridge/src/mtgtable/Snap.java:333-345
private static void card(final JsonOut o, final CardView cv, final PlayerView viewer) {
    final String zone = cv.getZone() == null ? null : lower(cv.getZone().name());
    final PlayerView controller = cv.getController();

    if (!cv.canBeShownTo(viewer)) {
        o.obj()
         .n("id", cv.getId())
         .n("zone", zone)
         .nInt("controller", controller == null ? null : Integer.valueOf(controller.getId()))
         .n("hidden", true)
         .end();
        return;
    }

    o.obj();
    o.n("id", cv.getId());
    o.n("name", cv.getName());
    // ... forty more lines of real card data
```

This is **the only function in the bridge that turns a `CardView` into JSON**.
There is deliberately no second path, because a second path is a path that can
forget the gate.

Why that matters: **Forge does not redact.** Its own network sync ships the
opponent's hand and library to the client and hides them in the *UI*. If you add
a new serialisation routine here and forget `canBeShownTo`, the default
behaviour is to write the opponent's hand into a file we then commit to a public
repo. The gate is the whole design.

`cv.canBeShownTo(viewer)` is Forge's own answer, not ours. Read it as prose:

```java
// forge-game/src/main/java/forge/game/card/CardView.java:622-651 (Forge source)
public boolean canBeShownTo(final PlayerView viewer) {
    if (viewer == null) { return false; }
    ZoneType zone = getZone();
    if (zone == null) { return true; } //cards outside any zone are visible to all
    final PlayerView controller = getController();
    switch (zone) {
    case Ante: case Command: case Battlefield: case Graveyard: ...
        //cards in these zones are visible to all
        return true;
    ...
    case Hand:
        if (controller.equals(viewer)) {
            return true;
        }
        break;
```

Battlefield and graveyard: public. Hand: only yours. Exile: face-up only.
Library: no. It also knows about temporary reveals (`mayPlayerLook`), which is
precisely the kind of rules subtlety we do not want to reimplement. Asking Forge
is both safer and shorter.

The redacted shape is **exactly four keys** — `id`, `zone`, `controller`,
`hidden` — and the `return` immediately after. No name, no mana cost, no types,
no power. The browser has a matching type for it:

```ts
// web/src/protocol.ts:525-535
export interface RedactedCard {
  id: number;
  zone: string;
  controller: number;
  hidden: true;
}

export type AnyCard = Card | RedactedCard;

/** §3.3. The one predicate the renderer uses; there is no second path. */
export function isHidden(card: AnyCard): card is RedactedCard {
  return card.hidden === true;
}
```

One gate on each side, and a test (`tools/check-redaction.mjs`) that reads a
recorded log and proves it held.

There is one more rule with no code to point at, because the point is the
*absence* of code:

```java
// bridge/src/mtgtable/Snap.java:291-294
// Protocol 3.4: the library is a count and NOTHING else -- not even for
// the viewer's own library.  A library search delivers its visible
// subset through an `ask`, never through `state`.
o.key("library").obj().n("count", p.getZoneSize(ZoneType.Library)).end();
```

Every other zone gets `zone(o, name, cards, viewer)` which emits a `cards` array.
The library gets a count. Not because the cards would fail `canBeShownTo` — they
would — but because shipping 33 redacted stubs per frame is pure waste, and
because "the library is a number" is an invariant you can check by eye.

### The rest of `card()`, briefly

```java
// bridge/src/mtgtable/Snap.java:985-1020
final CardView.CardStateView st = cv.getCurrentState();
if (st == null) {
    o.nNull("setCode").nNull("manaCost").nNull("types")
     .nNull("power").nNull("toughness").nNull("loyalty");
} else {
    o.n("setCode", st.getSetCode());
    final ManaCost mc = st.getManaCost();
    o.n("manaCost", mc == null ? null : mc.toString());
    o.n("types", st.getUntranslatedType());
    if (st.isCreature() || st.hasPrintedPT()) {
        o.n("power", Integer.toString(st.getPower()));
        o.n("toughness", Integer.toString(st.getToughness()));
    } else {
        o.nNull("power").nNull("toughness");
    }
    final String loyalty = st.getLoyalty();
    o.n("loyalty", st.isPlaneswalker() && !empty(loyalty) ? loyalty : null);
}
```

`CardStateView` is a card's *current face* — a transforming card has two states
and this is the one that's up. Note that **both branches write the same six
keys**: the protocol says these fields are always present, so the `null` branch
spells them all out. That is deliberate — the renderer never has to check for a
missing key, only for a null value. If you add a field to one branch, add it to
the other.

The `loyalty` line is a small lesson in not trusting an API: Forge's
`getLoyalty()` returns `"0"` for everything that isn't a planeswalker, which is
noise rather than a value, so we filter it to `null`.

### `JsonOut` is a `StringBuilder` with a bouncer

There is no JSON library here. gson isn't in the 2.0.14 jar, and Jetty's writer
would mean building a throwaway `Map` tree per frame, hundreds of times a game,
on the game thread. So `Json.JsonOut` appends characters to a `StringBuilder` —
Java's mutable string buffer, the thing you use instead of `+=` in a loop.

If you squint, the usage reads like the JSON it produces:

```java
// bridge/src/mtgtable/Json.java:132-140 (the class javadoc's own example)
String s = new JsonOut()
    .obj()
      .n("gameId", "g1").n("turn", 17)
      .key("players").arr()
         .obj().n("id", 0).n("life", 20).end()
      .end()
    .end()
    .done();
```

Every method returns `this`, so the calls chain — the builder pattern, Java's
substitute for a literal. `obj()`/`arr()` open, `end()` closes, `n(key, value)`
writes a key and a value in one go, `key("x")` writes a key whose value you're
about to build as a container, and `done()` hands back the string.

The bouncer is the state machine underneath:

```java
// bridge/src/mtgtable/Json.java:154-162
private final StringBuilder sb;
/** One entry per open container; {@code TRUE} = object, {@code FALSE} = array. */
private final Deque<Boolean> stack = new ArrayDeque<>();
/** Does the innermost open container still have no members? */
private boolean empty = true;
/** Has a key been written whose value is still owed? */
private boolean afterKey;
/** Has a complete top-level value been written? */
private boolean done;
```

Four booleans and a stack, and they buy you this:

```java
// bridge/src/mtgtable/Json.java:376-393
private void beforeValue() {
    if (stack.isEmpty()) {
        if (done) {
            throw new IllegalStateException("a second top-level value");
        }
        return;
    }
    if (stack.peek()) {           // object
        if (!afterKey) {
            throw new IllegalStateException("value inside an object without a key");
        }
        afterKey = false;
    } else {                      // array
        if (!empty) {
            sb.append(',');
        }
        empty = false;
    }
}
```

Every structural mistake — a value with no key, a key inside an array, an
unbalanced `end()`, a dangling key, a second top-level value, `done()` with a
container still open — throws `IllegalStateException` **at the call site**,
naming the mistake. Not a malformed file discovered by the reducer three hundred
frames later. When you're adding a field and you get "end() with a dangling key",
the message is telling you precisely what you did: you called `key("x")` and then
`end()` without writing the value.

The comma logic lives entirely in `beforeValue`/`key`: the writer tracks whether
the current container is empty and prepends `,` when it isn't. This is why you
never write a comma yourself, and why you can add a field anywhere in a sequence
without touching its neighbours.

Escaping lives in `Json.quote` (`Json.java:74-112`) and is more careful than you
might expect — control characters, and specifically *lone surrogates*, which
would otherwise produce a file no JSON parser will read. `JsonSelfTest` proves
it on every build.

---

## 6. How to make a change safely

### The three thread rules, in plain words

These are rules 1–3 of the nine in `CLAUDE.md`. Each has a verified failure
behind it. In plain language:

**Rule 1 — Install the GUI before you touch Forge at all.**
`GuiBase.setInterface(new HeadlessGuiBase(forgeHome))` must be the first Forge
call in any process you write. Forge's `ForgeConstants` computes its paths in a
class initialiser that asks the GUI where the assets are; if the GUI isn't there
yet, that initialiser fails *once*, permanently, and every later use of the
class throws. Symptom: `ExceptionInInitializerError` caused by
`NullPointerException`, before anything interesting has happened. And never
touch `forge.GuiDesktop` — its own initialiser asks for a screen and throws
`HeadlessException`.

**Rule 2 — There is one GUI thread, it is named `mtg-table-EDT`, and
`isGuiThread()` must really check.** Forge asserts in both directions: some
things must run on the GUI thread, and anything that *blocks waiting for a human*
must not. If `isGuiThread()` returns a constant, the second kind of assertion
fires the first time the engine asks for a mulligan decision, with
`IllegalStateException: ...awaitLatchRelease may not be accessed from the event
dispatch thread`. Our single-thread executor exists to make that check honest.

**Rule 3 — Only walk the view graph on the game thread.** `GameView`,
`PlayerView`, `CardView` and the `Tracker` behind them are not thread-safe, and
touching them from another thread corrupts them **silently** — no exception, just
wrong data later. "The game thread" means, literally, a thread whose name starts
with `Game`, because that is how `ThreadUtil.isGameThread()` decides. So:
snapshots are built in `handleGameEvents`, which our hand-registered
`GameEventForwarder` calls on the game thread, and *never* in `updateCards` /
`updateZones`, which arrive on the EDT.

`Snap` enforces rule 3 itself, at every public entry point:

```java
// bridge/src/mtgtable/Snap.java:537-546
/** Throw unless we are on the Forge game thread. */
public static void assertGameThread(final String what) {
    if (!ThreadUtil.isGameThread()) {
        throw new IllegalStateException(
            what + " must run on the Forge game thread (ThreadUtil.isGameThread(), i.e. a thread "
            + "whose name starts with \"Game\"); this is \"" + Thread.currentThread().getName()
            + "\". The Tracker is not thread safe and walking the view graph off the game thread "
            + "corrupts it silently.");
    }
}
```

If you ever see that message, you have not found a bug in `Snap` — you have
found that your new code is on the wrong thread. The fix is to get onto the
right one, the way `RecordMatch` does:

```java
// bridge/src/mtgtable/RecordMatch.java:327-335
game.getAction().invoke(() -> {
    try {
        match.startGame(game);
        // Still on the game thread: drain whatever the last flush left
        // behind, then emit a final snapshot and the `over` frame.
        forwarder.flush();
        gui.snapshot(List.of());
        gui.emitOver();
    } catch (final Throwable t) {
```

`game.getAction().invoke(Runnable)` dispatches to Forge's own `Game...` pool,
exactly as `HostedMatch` does. Everything inside that lambda is on the game
thread.

A corollary worth remembering: `HeadlessGuiBase.BG_NAME` is `"mtg-table-bg"` and
**must never start with `Game`**, or a background task would be mistaken for the
game thread and slip past every one of these asserts.

### Finding a Forge method's real signature with `javap`

Forge's API is large, undocumented, and slightly different between the source
checkout and the jar we compile against. Never guess. Ask the jar:

```bash
java -m jdk.jdeps/com.sun.tools.javap.Main \
  -cp /home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar \
  forge.game.card.CardView
```

That prints every member of the class as it exists *in the bytecode we link
against*. It's a lot of output, so pipe it:

```bash
export FORGE_JAR=/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar
jp() { java -m jdk.jdeps/com.sun.tools.javap.Main -cp "$FORGE_JAR" "$@"; }

jp forge.game.card.CardView | grep -i canBeShownTo
#   public boolean canBeShownToAny(java.lang.Iterable<forge.game.player.PlayerView>);
#   public boolean canBeShownTo(forge.game.player.PlayerView);
```

Three details that will save you time:

- **Inner classes use `$`.** `CardView.CardStateView` is
  `'forge.game.card.CardView$CardStateView'` — and you must quote it, or the
  shell will try to expand `$CardStateView`.
- **`javap` is not on `PATH`** on this machine (JRE only), which is why every
  script spells out `java -m jdk.jdeps/...`. `tools/check-forge.sh:19` defines
  the same shell function.
- **`-p` also shows private members**, and `-c` disassembles the bytecode. You
  will rarely want either, but `-p` occasionally answers "is there a field for
  this?".

The single most useful thing `javap` tells you is what a method *returns*.
`jp 'forge.game.card.CardView$CardStateView' | grep -i rarity` gives:

```
  public forge.card.CardRarity getRarity();
```

— so `getRarity()` returns an enum, not a `String`, and you now know you need
`.name()` before you can put it in JSON.

### Reading Forge source as prose

A Forge **2.0.15-SNAPSHOT** source checkout may be available in the session
scratchpad. It is slightly *ahead* of the 2.0.14 jar we compile against. Use it
to answer "what does this actually do?" and "why?", because reading twenty lines
of a method is worth an hour of guessing. Then:

- **Never copy-paste from it.** Licensing aside (copying from Forge is fine —
  same licence), the drift is real: `Game.setNoGUIUser()` exists in 2.0.15 and
  **not** in our jar, gson is a 2.0.15 dependency and is **not** in our jar.
  Code that reads fine in the checkout may simply not compile here.
- **Confirm every signature with `javap` before you use it.** Source tells you
  intent; `javap` tells you truth.
- Layout is Maven-standard, so the path is mechanical: package
  `forge.game.card.CardView` → `forge-game/src/main/java/forge/game/card/CardView.java`.
  The top-level modules are `forge-core`, `forge-game`, `forge-ai`, `forge-gui`,
  `forge-gui-desktop`.
- Cite what you find as `file:line`, the way the comments in this repo do —
  `forge-core/src/main/java/forge/util/ThreadUtil.java:51-53`. It makes the next
  person's job (often you, in a month) ten minutes shorter.

`grep -rn "methodName" forge-game/src/main/java/` is usually the fastest way in.

### The loop

From the repo root, always:

```bash
./tools/check-forge.sh            # gate: the jar exists and has every class we link
./bridge/build.sh                 # lint + javac + JsonSelfTest
./bridge/run.sh mtgtable.Smoke    # M0: does the engine still run?
```

`check-forge.sh` is the gate for everything below it — run it first when
something behaves strangely, because "the jar moved" explains a startling number
of symptoms.

For a change that touches the frame format, add:

```bash
./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --seed 42 \
    --out fixtures/games/g1.jsonl
node tools/check-redaction.mjs fixtures/games/g1.jsonl
npm --prefix web run typecheck && npm --prefix web test
```

`check-redaction.mjs` reads the recorded log and proves the hidden-information
invariants held. If you changed `Snap.card`, this is the test that matters.

Two more habits worth adopting:

- **When you change the wire format, change `docs/protocol.md` first.** Both the
  Java emitter and the TypeScript reducer are written against it; the document
  is the contract, not a description of the code.
- **Commit on your lane's branch, never straight onto `main`.** A lane works in
  a worktree on a branch of its own and merges to `main` only when the full gate
  is green; pushes, releases and anything public are the user's. The rule and
  its standing rules are the root `CLAUDE.md`'s
  [*Commits, branches and merges*](../../CLAUDE.md#commits-branches-and-merges)
  (**D201**).

### Reading a Java stack trace

You will see one. The shape:

```
java.lang.IllegalStateException: Snap.state must run on the Forge game thread ...
	at mtgtable.Snap.assertGameThread(Snap.java:225)
	at mtgtable.Snap.state(Snap.java:144)
	at mtgtable.RecordMatch$SpectatorGui.snapshot(RecordMatch.java:398)
	...
Caused by: java.lang.NullPointerException
	at ...
```

Read **top line first** (what went wrong), then the **first `at` line that
mentions `mtgtable.`** (that's your code — the frames above it are usually
library internals). `Caused by:` sections are the original exception, wrapped;
scroll to the *last* `Caused by` for the root cause. Java's modern NPE messages
are unusually good — they name the expression that was null — so read them
literally.

---

## 7. Glossary

| Term | What it is |
|---|---|
| **JVM** | The Java Virtual Machine — the runtime that loads `.class` files and executes them. `java` starts one. |
| **JDK / JRE** | JDK = runtime + developer tools (including the `javac` binary). JRE = runtime only. We have a JRE, hence `java -m jdk.compiler/...`. |
| **bytecode** | The instruction set in a `.class` file. Platform-independent; the JVM interprets and JIT-compiles it. |
| **`.class` file** | One compiled class. `bridge/out/mtgtable/Smoke.class`. |
| **jar** | A ZIP of `.class` files. A *fat jar* bundles dependencies too. |
| **classpath (`-cp`)** | Colon-separated list of directories and jars the JVM searches for class names. Ours: `bridge/out` + the Forge jar. |
| **package** | A namespace, declared at the top of a file (`package mtgtable;`) and mirrored by the directory layout. |
| **system property** | JVM-global string setting, set with `-Dkey=value`, read with `System.getProperty("key")`. |
| **static** | Belongs to the class rather than an instance. A `static` method is called as `Snap.state(...)`. |
| **final** | Assign-once (field/variable) or non-subclassable (class) or non-overridable (method). |
| **interface** | A list of method signatures with no bodies. `implements` it and you must supply every one. |
| **abstract class** | A partial class you can't instantiate. `AbstractGuiGame` implements part of `IGuiGame` and leaves the rest for you. |
| **`@Override`** | Annotation asserting "this replaces an inherited method". The compiler verifies it. |
| **generic / type parameter** | `List<CardView>`, `<T> List<T> order(...)`. Compile-time only; erased at runtime. |
| **enum** | A fixed set of singleton values with methods. `.name()` gives the declared name as a `String`. |
| **`Runnable`** | A zero-argument, no-return function. `() -> { ... }`. |
| **lambda** | `r -> { ... }`; an anonymous function. |
| **method reference** | `Integer::sum`, `this::drain`; shorthand for a lambda that just calls that method. |
| **`Future`** | A promise you *block* on: `future.get()` waits and returns the value. |
| **`ExecutorService`** | A thread pool with a task queue. `newSingleThreadExecutor()` has exactly one worker. |
| **daemon thread** | A thread that does not keep the JVM alive at exit. |
| **EDT** | Event Dispatch Thread — Swing's one UI thread. Ours is a stand-in named `mtg-table-EDT`. |
| **game thread** | In Forge, any thread whose name starts with `Game`. The only place the view graph may be walked. |
| **`synchronized`** | Method or block modifier: one thread at a time holds this object's lock. |
| **`volatile`** | Field modifier: reads and writes are visible across threads immediately. Used for `GameLog.failure`. |
| **checked exception** | One the compiler forces you to catch or declare (`IOException`). |
| **unchecked exception** | `RuntimeException` and subclasses — `IllegalStateException`, `NullPointerException`, `IllegalArgumentException`. Throw freely. |
| **`AutoCloseable`** | Has a `close()`; usable with try-with-resources (`try (X x = ...) { }`), which closes it automatically. `GameLog` implements it. |
| **`StringBuilder`** | Mutable string buffer. What `JsonOut` writes into. |
| **`Deque`** | Double-ended queue; `ArrayDeque` is the fast one. `JsonOut` uses it as a stack. |
| **NPE** | `NullPointerException`. You dereferenced null. |
| **javap** | Bytecode inspector: prints a compiled class's members. Our source of truth for Forge signatures. |
| **`CardView` / `PlayerView` / `GameView`** | Forge's *view* layer — read-only projections of game state, meant for a GUI. What we serialise. |
| **`Tracker`** | The change-tracking machinery behind the view graph. Not thread-safe; hence rule 3. |
| **`IGuiBase` / `IGuiGame`** | Forge's two GUI seams: application-level (paths, threads, dialogs) and match-level (prompts, choices, updates). |

---

## 8. Five exercises

Do them in order; each takes a few minutes. Work on a scratch copy or `git
checkout` afterwards — the point is the reading, not the diff.

---

### Exercise 1 — Add `rarity` to the card JSON

Every visible card in a `state` frame carries `setCode`, `manaCost`, `types`…
Add `rarity` (`"Common"`, `"Rare"`, …) alongside them.

**Try it before reading on.** Questions to answer: which method gives you the
rarity, what type does it return, where exactly does the line go, and what else
in the repo has to change?

<details>
<summary><b>Answer</b></summary>

**Step 1 — find the method.**

```bash
export FORGE_JAR=/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar
java -m jdk.jdeps/com.sun.tools.javap.Main -cp "$FORGE_JAR" \
  'forge.game.card.CardView$CardStateView' | grep -i rarity
#   public forge.card.CardRarity getRarity();
```

It's on `CardStateView` (the card's current face), not on `CardView`, and it
returns an **enum**, not a `String`.

**Step 2 — decide `.name()` or `.toString()`.**

```bash
java -m jdk.jdeps/com.sun.tools.javap.Main -cp "$FORGE_JAR" forge.card.CardRarity | head
# public final class forge.card.CardRarity extends java.lang.Enum<forge.card.CardRarity> {
#   public static final forge.card.CardRarity Common;
#   ...
#   public java.lang.String toString();
```

`CardRarity` **overrides `toString()`** — so it may return a display string, and
a display string is not a stable wire value. Use `.name()`, which is `Enum`'s
own method and always returns the declared constant name.

**Step 3 — write it in the right place.** Inside the `else` branch at
`Snap.java:355-374`, after `setCode`:

```java
o.n("setCode", st.getSetCode());
o.n("rarity", st.getRarity() == null ? null : st.getRarity().name());
```

and in the `st == null` branch at `Snap.java:352-354`, add `.nNull("rarity")` —
because the protocol says the key is always present.

**Step 4 — do NOT touch the redacted branch.** `Snap.java:337-344` emits four
keys and returns. Rarity is card identity; adding it there would leak which card
is in the opponent's hand. This is the entire point of the single gate.

**Step 5 — the other two ends.** Change `docs/protocol.md` §3.2 *first* (it's
the contract), then add `rarity: string | null;` to the `Card` interface in
`web/src/protocol.ts` — and **not** to `RedactedCard`.

**Step 6 — the loop.** `./bridge/build.sh`, re-record a fixture, `node
tools/check-redaction.mjs`, then `npm run typecheck` in `web/`.
</details>

---

### Exercise 2 — Print the deck's card names in `Smoke`

Smoke currently prints the deck's size and its set breakdown. Make it print
every distinct card name with its count, sorted alphabetically.

<details>
<summary><b>Answer</b></summary>

The loop shape already exists — copy it from `auditDeck` at `Smoke.java:274-281`.
Add to `auditDeck`, just before its closing print:

```java
final java.util.Map<String, Integer> byName = new java.util.TreeMap<>();
for (final Map.Entry<forge.item.PaperCard, Integer> e : deck.getMain()) {
    byName.merge(e.getKey().getName(), e.getValue(), Integer::sum);
}
System.out.println("deck list:");
for (final Map.Entry<String, Integer> e : byName.entrySet()) {
    System.out.println("  " + e.getValue() + "x " + e.getKey());
}
```

Three things this teaches:

- **`TreeMap` sorts by key**; `LinkedHashMap` (used above it) preserves insertion
  order; `HashMap` promises nothing. Pick deliberately.
- **`java.util.TreeMap` is fully qualified here** because `Smoke.java` imports
  `LinkedHashMap` and `Map` but not `TreeMap` (`Smoke.java:25-29`). Either add
  the import at the top or spell it out — Java has no auto-import. Same reason
  `forge.item.PaperCard` is written out.
- **`merge(key, value, Integer::sum)`** is the idiomatic counter increment; a
  `CardPool` can hold the same name across two sets, so summing is correct.

Rebuild and run: `./bridge/build.sh && ./bridge/run.sh mtgtable.Smoke`.
</details>

---

### Exercise 3 — Watch for a new engine complaint

`Smoke` tees stdout/stderr through a line scanner that counts lines matching a
list of needles. Add one for lines containing `"stack overflow"`.

<details>
<summary><b>Answer</b></summary>

`Smoke.java:67-78` is a two-dimensional array literal; each row is
`{label, needle}`:

```java
private static final String[][] WATCHED = {
    {"svar-fallback", "not found in ability"},
    {"unsupported-text", "unsupported"},
    {"stack-overflow", "stack overflow"},   // <- add this
};
```

`String[][]` is an array of `String[]`, and `{ {...}, {...} }` is the literal
syntax. Nothing else needs to change: the `Watcher` constructor
(`Smoke.java:362-368`) iterates `WATCHED` to build its counters, `endLine()`
(`Smoke.java:414-429`) matches case-insensitively against every row, and
`report()` (`Smoke.java:316-335`) prints every row with up to five samples.
Adding a row wires itself up.

**The trap to notice:** `report()` calls `out.stop()` and `err.stop()` *before*
printing (`Smoke.java:321-322`), because the report prints the needles and would
otherwise match its own output. If you ever add a needle that also appears in
normal summary text, that ordering is what saves you. `auditDeck` goes further
and deliberately avoids printing the literal word `"unsupported"`
(`Smoke.java:282-283`) for the same reason.
</details>

---

### Exercise 4 — Predict the exception

What does this print, and why?

```java
System.out.println(new Json.JsonOut().obj().key("a").end().done());
```

And this?

```java
System.out.println(new Json.JsonOut().obj().v("hello").end().done());
```

<details>
<summary><b>Answer</b></summary>

**The first** throws:

```
java.lang.IllegalStateException: end() with a dangling key -- the value was never written
```

from `Json.java:199-201`. `key("a")` sets `afterKey = true` (`Json.java:230`),
promising that the very next call writes exactly one value. `end()` checks
`afterKey` and refuses, because `{"a":}` is not JSON.

**The second** throws:

```
java.lang.IllegalStateException: value inside an object without a key
```

from `Json.java:357-358`, via `beforeValue()`. The innermost open container is
an object (`stack.peek()` is `TRUE`) and no key is outstanding, so a bare value
has nowhere to go. In an *array* the same call would be fine — that's the
`else` branch at `Json.java:361-365`, which is also where the separating comma
gets appended.

**Why this matters:** these are the two mistakes you will actually make when
adding a field, and the writer turns both into an immediate, named failure at
the call site rather than a malformed file the browser chokes on later. If you
want to see more of this behaviour specified, `JsonSelfTest.nestingErrors()`
asserts each one by name — `JsonSelfTest.java:169` and `:173` are these two
exact expressions — and it runs on every build.
</details>

---

### Exercise 5 — Break the thread rule on purpose

Add this to the end of `Smoke.run()`, just before the final `System.out.println`,
and predict what happens:

```java
System.out.println(Snap.state(game.getView(), null));
```

<details>
<summary><b>Answer</b></summary>

It throws, before touching any game data:

```
java.lang.IllegalStateException: Snap.state must run on the Forge game thread
(ThreadUtil.isGameThread(), i.e. a thread whose name starts with "Game"); this is
"main". The Tracker is not thread safe and walking the view graph off the game
thread corrupts it silently.
```

`Snap.state` opens with `assertGameThread("Snap.state")` (`Snap.java:144`), and
`ThreadUtil.isGameThread()` is `Thread.currentThread().getName().startsWith("Game")`.
`Smoke` calls `match.startGame(game)` directly on `main` (`Smoke.java:211`), so
the thread is called `"main"` and the assert fires.

That is the guard working. **The wrong fix is to delete the assert** — without
it the call would "succeed" and quietly corrupt the `Tracker`, and you'd find out
several frames later as wrong data with no exception anywhere.

**The right fix** is to get onto the game thread, which is what `RecordMatch`
does at `RecordMatch.java:265`:

```java
game.getAction().invoke(() -> {
    match.startGame(game);
    ...
});
```

`game.getAction().invoke(Runnable)` dispatches to Forge's own `Game...` pool.
Everything inside the lambda satisfies `isGameThread()`.

**Bonus:** why does `Smoke` get away with running on `main` at all? Because it
never snapshots — it only reads `game.getOutcome()` and `getPhaseHandler()` after
the game is completely over. The comment at `RecordMatch.java:256-261` spells out
exactly this distinction, and it's the reason M0 and M1 differ structurally.
</details>

---

## 9. A map of `WireGuiGame.java`, one ask and one act end to end, and the six self-tests

Chapters 3 to 6 teach you to read `HeadlessGuiBase`, `Smoke` and `Snap` — the
first milestone's files. Everything the seat does since M2 goes through one file
those chapters never open: `bridge/src/mtgtable/WireGuiGame.java`, **4,339
lines**, the largest file in the bridge. It is the human seat's `IGuiGame`: every
one of the 37 members Forge calls on a GUI lands there, and every frame the
browser sees leaves from there. This chapter is its map, and **the file carries
the same map itself**, as a comment block right after its licence header (§9.2).
**Every line number here was re-checked on 2026-09-29**, after that header went
in: its 128 comment lines moved every line of the file below them down by 128 and
changed no bytecode, and the other files' numbers were checked the same day. The
preamble's warning still holds — when the file and this chapter disagree, the file
is right — and for `WireGuiGame.java` the file's own header is where to look
first.

### 9.1 The threads you will meet

A TypeScript program has one thread and an event loop. The bridge has several
threads at once, and **which thread a line runs on is the most important fact
about it** (hard rules 2 and 3). Four matter here:

| thread | what it is | the TypeScript picture |
|---|---|---|
| `Game-0` (and other `Game-n`) | Forge's game thread: it runs the rules, and is the **only** thread allowed to walk Forge's views (`GameView`, `CardView`, …). `Game-n` workers come from Forge's cached pool (`ThreadUtil.invokeInGameThread`). | A worker that owns all the game state; nobody else may touch it. |
| `mtg-table-EDT` | Our stand-in for Swing's event-dispatch thread: a single-thread executor, `HeadlessGuiBase.java:170-175`. Forge draws prompts from it, and we apply clicks on it. | The browser's main thread: one task at a time, in order. `edt.execute(task)` is `queueMicrotask(task)`. |
| `mtg-table-io` / `mtg-table-ws` | Where the client's frames arrive: the console, automated and null transports' reader thread, or netty's event loop for the WebSocket (`WsTransport.java:356`). | The code that runs when `socket.onmessage` fires — except it is a thread of its own. |
| `main` | `MtgTable`'s main thread: it wires the seat, starts the match, then waits for games to start and end. | The script's top level, parked on `await`. |

### 9.2 The file, section by section

The file is cut into sections by its own `// ====` banners. The table gives each
section's lines, the methods in it, the thread each runs on, the lock it takes,
and the decision that governs it.

**This table is a mirror of the header at the top of `WireGuiGame.java`**, the
comment block right after the licence, which carries the same rows, the same
line numbers and a legend of the threads and locks. **The header is the
authoritative copy**, because it moves with the code: a change that moves a
section or a member fixes the header's numbers in the same commit, and this table
is brought into line from it — never the other way round. Where the two disagree,
believe the header, then fix this table.

| § | lines | section | methods | thread | lock | governed by |
|---|---|---|---|---|---|---|
| — | 212-252 | the class comment, then the class declaration (251) | the three rules the file is written to: a push touches only `getId()` on a view; only the game thread may block; no thread of ours is named `Game*` | — | — | report 07 §2.5, hard rules 2-3 |
| — | 253-899 | construction and injected wiring | the constructor (582), `setHostedMatch` (602), `setSession` (607), `setLogFactory` (617), `awaitGameEnd` (744) and `awaitGameStart` (749) with their `await` (776), the run summary's counters (`unimplemented` 793 … `refreshesSkipped` 892) | `main` | `lifecycle` (the game counters, which `main` waits on) | report 07 §3; **D44** (one log per game) |
| — | 900-1089 | frame emission | `emit` (911), `logC2s` (994), `envelope` (1030), `notice` (1057), `unimpl` (1078), `fired` (1086) | any thread that emits: the game thread (`state`), the EDT (`input`, notices), the transport thread, `main` (game 1's `hello_ok`); in the build, `OverRaceSelfTest`'s `mtg-table-bg` threads | **the current `GameLog`'s monitor**, held across numbering a frame and pushing it (947, 1012) | protocol §1 and §8.4; `over` is terminal (the re-check at 968 and 1013, `OverRaceSelfTest`) |
| 1 | 1090-1299 | `openView`, the wiring hook | `openView` (1102), `seedPhaseStops` (1189), `resetForGame` (1244) | game 1: the thread that calls `HostedMatch.startMatch` (`main`); later games: the EDT, from an `act: newGame` | `lifecycle`; `deferred` and `inputLock` inside the reset | report 07 §4.1; **D44**, amendment M38 (the one reset hook); **D38** |
| 2 | 1300-1663 | `handleGameEvents`, THE snapshot hook | `handleGameEvents` (1320), `flushState` (1335), `OutcomeWatcher` (1425), `FinishWatcher` (1447), `engineFinished` (1463), the test hooks (1479-1587), `captureOutcome` (1609; its hop at 1615) | the game thread; a batch that arrives on any other thread is buffered in `deferred` (1316-1323); `engineFinished` runs on the EDT | `deferred`'s monitor; `emit`'s | hard rule 3, **D5**; **D114** (`FinishWatcher`); **D39** (the hop's tag); amendments M4/M11 |
| 3 | 1664-1978 | the input path | `InputState` (1669), `engineInput` (1725), `mutateInput` (1737), `inputBody` (1753), `showPromptMessage` (1804), `updateButtons` (1819), `setSelectables` (1842), `setHighlighted` (1868), `setCard` (1904), `peekInput` (M65 / M66: what `InputPeek` reads off the input on the seat's queue), … | Forge pushes from the EDT, the game thread and the click thread | **`inputLock`**: the struct and its generation change together (1734-1741); the push happens after the lock is released (1742) | **D22** (`inputGen`), amendment M42 (`inputSeen`), protocol §4 |
| 4 | 1979-2151 | the other pushes | `updateCurrentPlayer` (1989, `AbstractGuiGame`'s own abstract member), the overlays, `message` (2040), `showErrorDialog` (2046), `finishGame` (2052), `engineCrashed` (2074), `afterGameEnd` (2087), `emitOver` (2104) | mostly the EDT; `engineCrashed` on the dying `Game-n` thread; `emitOver` from whichever thread saw the outcome | `this` (so `over` is emitted once); `lifecycle` (games finished) | amendments M4/M11; **D114**; **D115** |
| 5 | 2152-2264 | `openZones` / `tempShowZones`: hints, not questions | `tempShowZones` (2166), `openZones` (2182), `restoreOldZones` (2203), `hideZones` (2209), the zone-hint helpers (2206-2255) | the EDT (`openZones` sometimes the game thread) | `inputLock` (through `engineInput`) | protocol §4.3 |
| 6 | 2265-2282 | phase stops | `isUiSetToSkipPhase` (2275) | the game thread | none (a `ConcurrentHashMap`) | **D19**, **D38** |
| 6b | 2290-2550 | the comfort snapshot | the four M6 answers `Snap` cannot compute and M61's `playable`: the `Snap.Comfort` object (2299), `playableNow` (2368), `stopNames` (2392), `activeYieldJson` (2408), `undoStateJson` (2449), the yield handles (`rawYieldKey` 2495 — lint rule 4b's one `getKey()` is on 2496 — `handleFor` 2500, `standingYield` 2525) | the game thread (inside `Snap.state`) | none | **D41**, **D42** |
| 7 | 2551-3456 | the ask path | `ask` (2569), `decode` (2639), the option writers (2651-2754), then the blocking members: `getAbilityToPlay` (2758, and its asynchronous menu, 2817-2993, its hop at 2880), `confirm` (2996), `getChoices` (3088), `order` (3131), `chooseSingleEntityForEffect` (3195), `assignCombatDamage` (3277), `assignGenericAmount` (3339), `manipulateCardList` (3391), `sideboard` (3431), … | **the game thread, which parks** until the answer comes; `getAbilityToPlay` arrives on the EDT and hops (**D22**) | the log's monitor while the ask is numbered (2612-2620); none while parked | protocol §5 and §5.4 (every ask answerable with null); **D15**, **D24**; **D20**, **D22** |
| 8 | 3457-4243 | the inbound path: acts | `onAct` (3462), `applyAct` (3489), `concede` (3696), `setPhaseStop` (3808), `newGame` (3910), `yieldTo` (3978) with M64's `yieldToEndStepOrOpponent` and `EndStepWatcher` (a game-thread subscriber), `setYield` (4059), `refreshState` (4151; its hop at 4160), `refreshSnapshot` (4184), `enginePausedForSeat` (4232) | `onAct` on the transport thread; `applyAct` on the **EDT**; `refreshSnapshot` on a second `Game-n` worker | the log's monitor (the act's c2s line) | **D17** (acts on the EDT), **D39** (the refresh hop), **D41**, **D42**, **D114**, amendment M8 |
| 8b | 4244-4497 | the acts that write the engine from the EDT; answers, resync, disconnect | `notNow` (4264), `engineFacts` (4309), `GuardFeeds` (4318), `pressOk` (4361), `onAnswer` (4381), `onResync` (4416), `onDisconnect` (4471), `close` (4489) | `notNow` / `pressOk` on the EDT; `onAnswer`, `onResync`, `onDisconnect` on the transport thread | none of its own: volatile reads and atomics (a frame written here takes the log's monitor in `emit` / `logC2s`) | **D136**, amendment M48; **D27**, amendment M42; **D24** |
| 9 | 4498-4554 | answer coercion | `asInt` (4510), `asBool` (4514), `asIntArray` (4518), `asIntMap` (4522), `indexOfIdentity` (4527), `actBody` (4532) — the rest is `Ask.java` | any (pure functions) | none | protocol §5.3 |

Three places in the file hop onto Forge's game pool so that a thread named
`Game-n` may walk the views: `captureOutcome` (the hop at 1615, tagged **D39**),
`asyncAbilityMenu` (2835, **D22**) and `refreshState` (4112, **D39**). Each carries an `// ALLOW hop:` tag naming its
argument, and `tools/lint-bridge.sh` fails a fourth (hard rule 3, **D181**).

### 9.3 Java's concurrency words, in TypeScript terms

- **`synchronized (x) { … }`** — only one thread at a time may be inside any
  block synchronized on the same object `x`; the others wait at the door. JS
  never needs this, because only one thing runs at a time. The nearest picture is
  an async mutex (`await lock.acquire(); try { … } finally { lock.release() }`),
  except that the waiting thread is frozen, not suspended. It is *reentrant*: a
  thread already holding `x` may enter another block on `x` (that is why `emit`
  can call `GameLog.s2c`, which is itself `synchronized` on the log).
- **The monitor** — every Java object carries one lock and one waiting room.
  `lifecycle.wait()` parks a thread in the room until someone calls
  `lifecycle.notifyAll()`. JS's nearest is `Atomics.wait` / `Atomics.notify`
  on a `SharedArrayBuffer` — a thread asleep until another wakes it.
- **`volatile`** — every read sees the latest write from any thread. In
  single-threaded JS that is simply true; across workers it is what
  `Atomics.load` / `Atomics.store` give you. `overEmitted`, `inputSeen` and
  `ready` are volatile because four threads read them.
- **`AtomicLong` / `AtomicInteger`** — a counter whose `incrementAndGet()` cannot
  lose an update to a racing thread: `Atomics.add` on a shared array.
  `inputGen` is one.
- **`CompletableFuture<String>`** — a promise you can resolve from outside, like
  `Promise.withResolvers()`. The difference that matters: **`future.get()`
  blocks the calling thread** until the value arrives, where `await` only
  suspends one async function and lets the event loop run everything else. When
  `Game-0` calls `get()`, the whole rules engine stops on that line.
- **`ExecutorService` (single thread)** — a queue of tasks drained by one named
  thread, in order: exactly a JS event loop. `edt.execute(task)` is
  `queueMicrotask(task)`; the executor at `HeadlessGuiBase.java:170-175` *is*
  the bridge's event loop.
- **`ConcurrentHashMap`** — a `Map` that several threads may read and write at
  once without corrupting it. The reply pool and the ask bookkeeping are built on
  it.

### 9.4 One ask, end to end: Forge asks the seat to choose

The ask is the one place the rules engine **waits for the browser**.
`getChoices` is the commonest kind (`choose_list`); the other blocking members
follow the same path.

1. **Forge, on `Game-0`, calls `getChoices(...)`** (`WireGuiGame.java:3035`). If
   the caller is not a game thread, it returns Forge's default at once
   (3039-2937): only the game thread may block, because a parked EDT would stop
   every prompt.
2. **`ask("choose_list", opts, writer)`** (2516) asserts it is on a game thread
   (2517), flushes a fresh `state` first (2529 — the snapshot in which a card
   revealed for this choice is visible, report 06 W4), mints an `askId` (2530),
   asks the transport for its timeout (2531) and keeps the option list in
   `pendingOpts` (2533): an answer's indexes resolve against that list and
   nothing else.
3. **The frame is numbered** under the log's monitor, with the same
   "`over` already sent?" re-check `emit` makes (2552-2458).
4. **`pool.register(askId, kind)`** (2563; `ReplyPool.java:99`) puts a fresh
   `CompletableFuture` in the pool *before* the frame goes out, so an answer can
   never arrive for an ask nobody registered.
5. **`transport.ask(askId, frame, timeoutMs)`** (2568). Over the socket that is
   `WsTransport.ask` (`WsTransport.java:404`): remember the frame for a
   reconnecting client, push it (366; netty writes it from its own loop, 498),
   then **`pool.await(askId, deadline)`** (`ReplyPool.java:117`), which is
   `future.get()`. `Game-0` is now parked. While a client is connected there is
   no deadline (**D24**); a disconnect answers every parked ask with null
   (`cancelAll`, 178), which is always legal (protocol §5.4).
6. **The browser answers** `{type:"answer", body:{askId, value}}`. netty's
   thread parses it and calls `inbound.onAnswer(...)` (`WsTransport.java:601`).
7. **`WireGuiGame.onAnswer`** (4322) first asserts it is neither the game thread
   nor the EDT (4323-4173): completing the future from the parked thread itself
   would deadlock, and an answer must not queue behind prompts. It validates the
   JSON (4326-4181), logs the `answer` frame (4338), and calls
   **`pool.complete(askId, value)`** (4349; `ReplyPool.java:146`) — the
   `resolve()`. A second answer for the same ask finds the future already
   completed and becomes a *Late answer* notice (4349-4202).
8. **`Game-0` wakes** inside `get()`. `await` removes the entry on its way out,
   `ask` decodes the text (2569; a malformed answer is null, 2581-2486) and drops
   `pendingOpts` (2576).
9. **`getChoices` turns the indexes into Forge's objects** — `Ask.pick(source,
   picks)`, or Forge's documented default when the answer was null (3064-2961) —
   and returns into the engine, which carries on.

In TypeScript terms: the game thread does `const v = await pool.promiseFor(askId)`
and the socket handler does `pool.resolve(askId, v)` — with the one difference
that Java's `get()` freezes the whole thread, which is exactly what Forge
expects of a GUI.

### 9.5 One act, end to end: the player presses Undo

An act is the browser **telling** the engine something; nothing waits for it.
`undo` is the most careful one, because it writes the engine's state directly.

1. **The browser sends** `{type:"act", body:{action:"undo"}}`. Over the socket,
   netty's thread calls `inbound.onAct("undo", body)` (`WsTransport.java:585`);
   at the console, `mtg-table-io` does (`ConsoleTransport.java:576`).
2. **`onAct`** (`WireGuiGame.java:3409`) asserts it is neither the game thread
   nor the EDT (3410-3307), logs the `act` (3412), reads **`inputGen` now** —
   the generation of the input the act arrived under (3416) — and hands the rest
   to the EDT with `FThreads.invokeInEdtNowOrLater` (3422), which lands in
   `HeadlessGuiBase`'s single-thread executor (`invokeInEdtLater`, 228). Acts run
   on the EDT because desktop Forge applies clicks there, serialised with prompt
   rendering (**D17**). In TypeScript: `queueMicrotask(() => applyAct(...))` on
   the one loop that also draws the prompts.
3. **`applyAct`**, on `mtg-table-EDT` (3436): until the engine has asked this
   seat anything (`!ready || !inputSeen`, 3437) every act but `concede` is
   dropped with *Not yet*. Then it finds the seat's controller (3455) and, for
   `undo` (3517), asks **`notNow("undo", …)`** (3522).
4. **`notNow`** (4205) reads the engine's state once — `engineFacts` (4250)
   through `GuardFeeds` (4259), one read per condition — and asks
   **`ActGuard.whyNotNow`** (`ActGuard.java:224`) the eight questions, in order:
   1. is the game live (the engine has asked this seat something, and it is not
      over)?
   2. is no ask pending (its answer would wake a game thread in the middle of
      the write)?
   3. is an input up (so `Game-0` is parked in Forge's `showAndWait`)?
   4. is the input generation still the one the act arrived under (**D22**)?
   5. is no mana ability being activated on a worker?
   6. is no OK or pass of ours still with the engine (the mana-lost confirm's
      worker)?
   7. is none of our own hops walking the views?
   8. is no engine thread running?

   Any *no* is a reason: the act is counted, `NOT NOW` goes to stderr, and the
   seat gets `notice {title:"Not now"}` (4228-4085). **The engine is not
   touched** (**D136**, amendment M48).
5. **All quiet: `c.undoLastAction()`** (3525), on the EDT, exactly where desktop
   Forge's own Ctrl+Z runs it. An undo produces no game event, so nothing would
   send the new board — hence **`refreshState()`** (3527).
6. **`refreshState`** (4092) reads the generation on the EDT (4098), counts
   itself as a hop in flight (4099) and hops onto Forge's pool with
   `ThreadUtil.invokeInGameThread` (4112) — one of the three tagged hops. On that
   second `Game-n` worker, **`refreshSnapshot`** (4125) checks again that the
   generation has not moved (4129) and that the engine is parked for this seat
   (4135; `enginePausedForSeat`, 4173), and only then flushes a `state` (4139).
   Its thread name starts with `Game`, and `Game-0` is provably parked: that is
   **D39**'s argument for why this walk is legal.

The guard's eight conditions are the TypeScript habit `if (store.version !==
versionWhenClicked) return` grown up: in a single-threaded app "the state moved
under me" has one cause, and here it has eight, because several threads can be
inside the engine at once.

### 9.6 The six self-tests, and the bug behind each

`bridge/build.sh` runs six `main()` programs after javac; any failure fails the
build. There is no JUnit on this machine (a JRE, no Maven), so each is a plain
class that prints and exits non-zero. Each exists because of a defect that a
green run did not show.

| self-test | what it checks | the bug it exists for |
|---|---|---|
| `JsonSelfTest` | `Json.java`'s writer — escaping, numbers, nesting and nesting errors — with every document round-tripped through Jetty's parser | none shipped: it is M1's rule that a broken escape or nesting check fails the build, "not a fixture three hundred frames in" (`bridge/build.sh`) |
| `AskSelfTest` | the answer half of all eleven ask kinds, driven by the JSON text a client really sends | in M2 Forge dispatched only two kinds, so nine marshallers had been checked only against a fixture written from the same reading of the protocol; `assign_damage`'s "option 0 is the defender, option *i* is `blockers.get(i-1)`" is a one-off error that yields a well-formed answer either way. It also holds that a wrong-length `manipulate_list` answer is the identity order |
| `GameLogSelfTest` | the frame log's close path: closed in under a second, exactly *N*+1 lines on disk | `close()` held the log's monitor across its own 30-second `join` while the appender needed that monitor after every line: close burned the whole timeout and returned a truncated file (12,089 of 20,001 lines), and the process's exit killed the appender mid-write |
| `OverRaceSelfTest` | `over` stays the last frame while another thread emits: it parks an `input`, then an act, on the log's monitor behind `over`, then races 300 rounds | `emit` and `logC2s` checked `overEmitted` *outside* the monitor that numbers a frame, so under load an `input` (or an act) was numbered one past `over`; three gate runs failed 10a, 10b or 10g on it. The fix is the re-check at `WireGuiGame.java:865` and `:910` |
| `WsObserveSelfTest` | amendment **M50**: a real `WsTransport` on a free loopback port, driven by raw-socket clients that pick their own `Origin` — a disallowed one is a 403 on `/ws` and `/observe`, an observer is never the seat (a second `/ws` is still refused 4001; `onResync` and `onDisconnect` never fire for one), nothing an observer sends reaches anything, a late observer's catch-up is the cached frames byte for byte, and one that never reads is dropped at the 8 MB backlog bound while `push()` keeps returning | none shipped: it was written with the observer socket (**D280**–**D282**), because "a follower can never act" and "a stalled follower can never stall the game" are each invisible in a green game |
| `ActGuardSelfTest` | **D136**'s guard: each of the eight conditions refuses on its own, the thread-state reading holds on real threads, and the wiring — `ActGuard.facts` driven with fake feeds, so a condition fed a constant or another condition's feed flips a verdict | an `undo` applied whenever it arrived raced `Game-0` inside `MagicStack`'s undo stack (`clearUndoStack`) and crashed the engine in the story branch's gate run; the wiring half came from Polish 1, after a skeptic showed the decision table alone passed a mis-wired guard |

`OverRaceSelfTest` and `ActGuardSelfTest` load `WireGuiGame`, so they install the
headless GUI first (hard rule 1) and run under hard rule 6's JVM flags; none of
the six boots an engine. `bridge/CLAUDE.md`'s *The build's self-tests* is the
long form.

---

## Where to go next

- `docs/protocol.md` — the wire contract. Read §3 before changing `Snap`.
- `docs/research/05-architecture-synthesis.md` — the spec.
- `CLAUDE.md` — the eleven hard rules, each with a failure behind it — and
  `bridge/CLAUDE.md`, the bridge's own conventions.
- Chapter 9 above — the map of `WireGuiGame.java`, the seat itself.
- `bridge/src/mtgtable/RecordMatch.java` — the AI-vs-AI recorder, and the
  smallest program that puts everything in chapters 3 to 6 together: an
  `AbstractGuiGame` subclass, a hand-registered event forwarder, a background
  writer thread, and a `CountDownLatch` for "wait until the game thread says it's
  done".

And when in doubt: `javap` the class, read the Forge source as prose, and trust
the file over this guide.
