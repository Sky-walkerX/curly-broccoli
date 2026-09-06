"""
Incremental reader for the local model's JSON as it is still being written.

The model answers with {"mappings":[ {...}, {...} ]} and Ollama streams that a few
characters at a time. To show an admin what the model is mapping *while it thinks*,
we pull out each mapping object the moment its closing brace arrives, instead of
waiting for the whole reply. Nothing is shown that the model hasn't actually emitted.

Deliberately hand-rolled rather than a streaming-JSON dependency: it is ~60 lines,
has no failure mode worse than "emit nothing and let the final parse handle it", and
keeps the air-gapped install free of another package.
"""
import json


class MappingStream:
    """Feed it chunks; it returns each complete mapping object exactly once."""

    def __init__(self, key="mappings"):
        self._key = f'"{key}"'
        self.buf = ""
        self.pos = None      # scan cursor; None until the array actually opens
        self.closed = False  # the array ended -- ignore anything after it

    def feed(self, chunk):
        if self.closed:
            return []
        self.buf += chunk
        if self.pos is None and not self._find_array():
            return []
        out = []
        while True:
            obj, advanced = self._next_object()
            if not advanced:
                break
            if obj is not None:
                out.append(obj)
        return out

    def _find_array(self):
        """Locate the '[' that opens the mappings array. Returns True once found."""
        i = self.buf.find(self._key)
        if i == -1:
            return False
        j = self.buf.find("[", i + len(self._key))
        if j == -1:
            return False
        self.pos = j + 1
        return True

    def _next_object(self):
        """Extract the next balanced {...} after the cursor.

        Returns (object_or_None, advanced). advanced=False means "nothing complete
        yet, wait for more bytes"; an object that fails to parse still advances, so
        one malformed entry can't stall the ones behind it.
        """
        start = None
        for i in range(self.pos, len(self.buf)):
            c = self.buf[i]
            if c == "{":
                start = i
                break
            if c == "]":                 # array finished before another object
                self.closed = True
                return None, False
        if start is None:
            return None, False

        depth, in_str, esc = 0, False, False
        for i in range(start, len(self.buf)):
            c = self.buf[i]
            if in_str:
                if esc:
                    esc = False
                elif c == "\\":
                    esc = True
                elif c == '"':
                    in_str = False
                continue
            if c == '"':
                in_str = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    raw = self.buf[start:i + 1]
                    self.pos = i + 1
                    try:
                        return json.loads(raw), True
                    except json.JSONDecodeError:
                        return None, True   # skip it, keep going
        return None, False                  # object still arriving
