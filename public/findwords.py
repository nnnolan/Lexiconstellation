#!/usr/bin/env python3
import sys
import collections

def load_wordlist(filename):
    """Load words (one per line) from a file, return as list of lowercase words."""
    words = []
    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            w = line.strip().lower()
            # chop the ; everything after 
            w.partition(";")
            if w:
                words.append(w)
    return words

def has_scrambled_substring(word, target):
    """
    Check if `word` contains any substring of length len(target)
    which is a permutation of `target`.
    """
    tlen = len(target)
    target_count = collections.Counter(target)
    for i in range(len(word) - tlen + 1):
        sub = word[i : i + tlen]
        if collections.Counter(sub) == target_count:
            return True
    return False

def find_matches(words, target):
    """Return list of words from `words` that contain a scrambled `target` substring."""
    matches = []
    for w in words:
        if has_scrambled_substring(w, target):
            matches.append(w)
    return matches

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 script.py words.txt")
        sys.exit(1)
    filename = sys.argv[1]
    words = load_wordlist(filename)
    target = "brain"  # you can change this if you like
    matches = find_matches(words, target)
    print(f"Found {len(matches)} words containing a scrambled '{target}' substring:")
    for m in sorted(matches):
        print(m)

if __name__ == "__main__":
    main()
