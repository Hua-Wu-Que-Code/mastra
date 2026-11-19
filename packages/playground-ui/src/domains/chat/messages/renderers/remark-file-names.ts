import type { Root, RootContent } from 'mdast';

/** Only known conversation files. Preserve fenced code and link destinations. */
export function remarkFileNames(options: { paths: readonly string[] }) {
  const names = new Map(options.paths.map(path => [path.replace(/^\.?\//, ''), path.split('/').at(-1) ?? path]));
  const paths = [...names.keys()]
    .flatMap(path => [path, '/' + path, './' + path])
    .sort((a, b) => b.length - a.length)
    .map(path => path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = paths.length
    ? new RegExp(`(?<![A-Za-z0-9_./-])(?:${paths.join('|')})(?![A-Za-z0-9_./-])`, 'g')
    : undefined;
  return (tree: Root) => {
    const walk = (node: Root | RootContent) => {
      if (node.type === 'code') return;
      if (node.type === 'inlineCode') {
        const name = names.get(node.value.replace(/^\.?\//, ''));
        if (name) node.value = name;
      } else if (node.type === 'text' && pattern) {
        node.value = node.value.replace(pattern, path => names.get(path.replace(/^\.?\//, '')) ?? path);
      } else if ('children' in node) node.children.forEach(walk);
    };
    walk(tree);
  };
}
