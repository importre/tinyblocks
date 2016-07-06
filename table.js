'use strict';

const {
  chunk,
  indexOf,
  range
} = require('lodash');

const RE_TABLE = /(?:\[(.+)\])?\s+(\|===)\n((?:.*\n)*?)\2/mg;
const RE_METADATA = /(.+?)="(.+?)"(?:\s*,\s*|\s*$)/g;
const RE_SEPARATOR = /[ \t]*(?:([<^>]))?\|[ \t]+/;

function parseMetadata(input) {
  const result = {
    cols: [1],
    options: []
  };

  input.forEach(item => {
    if (item[0] === 'cols') {
      result.cols = item[1].split(/\s*,\s*/g).map(i => parseInt(i, 10));
    } else if (item[0] === 'options') {
      result.options = item[1].split(/\s*,\s*/g).map(i => i.trim());
    }
  });

  const total = result.cols.reduce((prev, curr) => prev + curr, 0);
  if (total > 0) {
    result.cols = result.cols.map(col => Math.round((col / total) * 100));
  }
  return result;
}

function parse(input) {
  RE_TABLE.lastIndex = 0;
  RE_METADATA.lastIndex = 0;

  const match = RE_TABLE.exec(input);
  if (!match) {
    return null;
  }

  const rawMetadata = [];
  let m = null;
  while ((m = RE_METADATA.exec(match[1])) !== null) {
    rawMetadata.push([m[1], m[2]]);
  }

  const metadata = parseMetadata(rawMetadata);

  const cells = [];
  let rawCells = match[3].trim().split(RE_SEPARATOR);
  rawCells = rawCells.slice(1);

  for (let i = 0; i < rawCells.length; i += 2) {
    const sort = rawCells[i] || '<';
    const text = rawCells[i + 1];
    cells.push([sort, text]);
  }

  return {
    metadata, cells
  };
}

function getAlign(data) {
  switch (data) {
    case '>':
      return 'right';
    case '^':
      return 'center';
    default:
      return 'left';
  }
}

function getIndent(depth = 0, indent) {
  return range(depth).map(() => indent || '').join('');
}

function renderHtml(metadata, cells, indent) {
  const space = (!indent || indent === '') ? '' : indent;
  const newLine = (!space || space === '') ? '' : '\n';
  const hasHeader = indexOf(metadata.options, 'header') >= 0;
  const numCols = metadata.cols.length;
  const cols = metadata.cols.map(col => {
    return [getIndent(2, space), '<col style="width: ', col, '%">'].join('');
  }).join(newLine);
  const colgroup = [
    [space, '<colgroup>'].join(''),
    cols, [space, '</colgroup>'].join('')
  ].join(newLine);

  const rows = chunk(cells, numCols).map((row, rowIndex) => {
    const colItems = row.map(col => {
      const align = getAlign(col[0]);
      const tag = rowIndex === 0 && hasHeader ? 'th' : 'td';
      return [
        [getIndent(2, space), '<', tag, ' align="', align, '">'].join(''),
        col[1].trim().replace(/\n/g, '<br/>'), ['</', tag, '>'].join('')
      ].join('');
    }).join(newLine);
    return [
      [space, '<tr>'].join(''),
      colItems,
      [space, '</tr>'].join('')
    ].join(newLine);
  }).join(newLine);

  return [
    '<table class="table" width="100%">',
    colgroup,
    rows,
    '</table>'
  ].join(newLine);
}

function renderJson(metadata, cells, indent) {
  cells.forEach((cell, index) => {
    cells[index] = {
      align: getAlign(cell[0]),
      text: cell[1]
    };
  });
  const table = {
    metadata, cells
  };
  return JSON.stringify(table, null, indent);
}

module.exports = {
  parse,
  renderHtml,
  renderJson
};

