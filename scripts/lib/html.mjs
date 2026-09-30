// Small HTML helpers shared by the build guards. The built pages are machine-generated and well formed,
// so a tokenizer-level approach is enough. No dependencies.

export const decode = value =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&#x0*27;/gi, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/**
 * Reads an attribute from one tag's source (or a bare attribute string). Attributes are
 * tokenized left to right, so text inside another attribute's value can never match.
 * Returns '' for boolean attributes and null when the attribute is absent.
 */
export const attribute = (tag, name) => {
  const body = tag.replace(/^<[a-z][^\s/>]*/i, '').replace(/\/?>$/, '');
  for (const [, key, double, single, bare] of body.matchAll(/([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    if (key.toLowerCase() === name) return decode(double ?? single ?? bare ?? '');
  }
  return null;
};

/** The visible and screen-reader text of a page: no scripts, styles, comments or tags. */
export const textOf = source =>
  decode(
    source
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();

/** Returns the source of every element that carries `attr`, matching the closing tag by depth. */
export const elementsWith = (source, attr) => {
  const found = [];
  const start = new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*\\s${attr}(?=[\\s=>/])[^>]*>`, 'gi');
  for (const match of source.matchAll(start)) {
    const tag = match[1].toLowerCase();
    const scan = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
    scan.lastIndex = match.index + match[0].length;
    let depth = 1;
    let end = source.length;
    for (let next = scan.exec(source); next; next = scan.exec(source)) {
      depth += next[1] ? -1 : next[0].endsWith('/>') ? 0 : 1;
      if (depth === 0) {
        end = next.index + next[0].length;
        break;
      }
    }
    found.push(source.slice(match.index, end));
  }
  return found;
};

/** The page with every element that carries `attr` removed. */
export const withoutElements = (source, attr) => elementsWith(source, attr).reduce((rest, element) => rest.replace(element, ' '), source);
