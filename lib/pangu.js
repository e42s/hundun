
var merge = require('merge');

// 汉字后的半角标点符号。
var RE_PUNCTUATION_AFTER_HAN = /([\u4e00-\u9fa5\u3040-\u30FF])([ \t]*[.,;!:?\\\/]|[()\[\]{}<>'"])/g;
// 汉字前的半角标点符号。
var RE_PUNCTUATION_BEFORE_HAN = /([(\[{<'"])([\u4e00-\u9fa5\u3040-\u30FF])/g;
var RE_HAN_CHAR = /([\u4e00-\u9fa5\u3040-\u30FF])([ \t]*)([a-zA-Z0-9@&=\[\$\%\^\-\+\(\/\\])/g; // 汉字CH
var RE_CHAR_HAN = /([a-zA-Z0-9!&;=,.:?$%^+)\/\\\]-])([ \t]*)([\u4e00-\u9fa5\u3040-\u30FF])/g; // CH汉字

// 英文标点到中文标点。
var PUNCTUATION_EN = '.,;!:?\\()[]{}<>"\'';
var PUNCTUATION_CN = '。，；！：？、（）『』〖〗《》"\'';

// 中文标点到英文标点。
var PUNCTUATION_CN_2 = '～＠％＊　';
var PUNCTUATION_EN_2 = '~@%* ';
var RE_PUNCTUATION_2 = new RegExp('([' + PUNCTUATION_CN_2 + '])', 'g');

var NUMBER_CN = '０１２３４５６７８９';
var NUMBER_EN = '0123456789';
var RE_NUMBER = new RegExp('([' + NUMBER_CN + '])', 'g');

var CHAR_CN = 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ';
var CHAR_EN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
var RE_CHAR = new RegExp('([' + CHAR_CN + '])', 'g');

var RE_TRAILLING_WHITESPACE = /[ \t]+$/g;

/* global exports */
function pangu(text, options) {
  // 不允许行尾空白。
  if (!options.trailling_whitespace) {
    text = text.replace(RE_TRAILLING_WHITESPACE, '');
  }

  // 汉字后的半角标点符号，转成全角标点符号。
  text = text.replace(RE_PUNCTUATION_AFTER_HAN, function($0, $1_han, $2_punctuate) {
    return $1_han + PUNCTUATION_CN.charAt( PUNCTUATION_EN.indexOf($2_punctuate) );
  });
  // 汉字前的半角标点符号，转成全角标点符号。
  text = text.replace(RE_PUNCTUATION_BEFORE_HAN, function($0, $1_punctuate, $2_han) {
    return PUNCTUATION_CN.charAt( PUNCTUATION_EN.indexOf($1_punctuate) ) + $2_han;
  });

  // 全角数字。
  text = text.replace(RE_NUMBER, function($0, $1_num_cn) {
    return NUMBER_EN.charAt( NUMBER_CN.indexOf($1_num_cn) );
  });

  // 全角英文字符转成半角英文字符。
  text = text.replace(RE_CHAR, function($0, $1_char_cn) {
    return CHAR_EN.charAt( CHAR_CN.indexOf($1_char_cn) );
  });

  // 全角英文标点转成半角英文标点。
  text = text.replace(RE_PUNCTUATION_2, function($0, $1_punctuation_cn) {
    return PUNCTUATION_EN_2.charAt( PUNCTUATION_CN_2.indexOf($1_punctuation_cn) );
  });

  // 汉字前后的英文字符、数字、标点间增加空白。
  text = text.replace(RE_HAN_CHAR, '$1' + options.pangu_spacing + '$3'); // 汉字在前。
  text = text.replace(RE_CHAR_HAN, '$1' + options.pangu_spacing + '$3'); // 汉字在后。

  return text;
};

function isHan(ch) {
  return /[\u4e00-\u9fa5\u3040-\u30FF]/.test(ch);
}

function execute(regexp, text, handler) {
  var match;
  while (match = regexp.exec(text)) {
    handler(match, text, regexp);
  }
}

function lintLine(line, lineno, options) {
  var output = [];

  if (!options.trailling_whitespace) {
    var matchedTrailling = line.match(RE_TRAILLING_WHITESPACE);
    if (matchedTrailling) {
      output.push({
        type: 'warning',
        lineno: lineno,
        colno: line.length - matchedTrailling.length,
        message: 'Trailling with whitespace.'
      });
    }
  }

  var matchedPunctuationBeforeHan;
  while (matchedPunctuationBeforeHan = RE_PUNCTUATION_BEFORE_HAN.exec(line)) {
    output.push({
      type: "error",
      lineno: lineno,
      colno: matchedPunctuationBeforeHan.index + 1,
      message: 'Use full-width punctuation please.'
    });
  }
  // 修复标点，避免再次命中其他规则。
  line = line.replace(RE_PUNCTUATION_BEFORE_HAN, function($0, $1_punctuate, $2_han) {
    return PUNCTUATION_CN.charAt( PUNCTUATION_EN.indexOf($1_punctuate) ) + $2_han;
  });

  var matchedPunctuationAfterHan;
  while (matchedPunctuationAfterHan = RE_PUNCTUATION_AFTER_HAN.exec(line)) {
    output.push({
      type: "error",
      lineno: lineno,
      colno: matchedPunctuationAfterHan.index + 2,
      message: 'Use full-width punctuation please.'
    });
  }
  // 修复标点，避免再次命中其他规则。
  line = line.replace(RE_PUNCTUATION_AFTER_HAN, function($0, $1_han, $2_punctuate) {
    return $1_han + PUNCTUATION_CN.charAt( PUNCTUATION_EN.indexOf($2_punctuate) );
  });

  execute(RE_NUMBER, line, function(match) {
    output.push({
      type: "error",
      lineno: lineno,
      colno: match.index,
      message: 'Don\'t use full-width number.'
    });
  });
  // 修复数字，避免再次命中其他规则。
  line = line.replace(RE_NUMBER, function($0, $1_num_cn) {
    return NUMBER_EN.charAt( NUMBER_CN.indexOf($1_num_cn) );
  });

  execute(RE_CHAR, line, function(match) {
    output.push({
      type: "error",
      lineno: lineno,
      colno: match.index,
      message: 'Don\'t use full-width char.'
    });
  });
  // 修复字符，避免再次命中其他规则。
  line = line.replace(RE_CHAR, function($0, $1_char_cn) {
    return CHAR_EN.charAt( CHAR_CN.indexOf($1_char_cn) );
  });

  execute(RE_HAN_CHAR, line, function(match) {
    output.push({
      type: "warning",
      lineno: lineno,
      colno: match.index + 1,
      message: 'With whitespace between HanZi and ASCII char.'
    });
  });
  // 修复中英文间的空白，避免再次命中其他规则。
  line = line.replace(RE_HAN_CHAR, '$1' + options.pangu_spacing + '$3'); // 汉字在前。

  execute(RE_CHAR_HAN, line, function(match) {
    output.push({
      type: "warning",
      lineno: lineno,
      colno: match.index + 1,
      message: 'With whitespace between ASCII char and HanZi.'
    });
  });
  // 修复中英文间的空白，避免再次命中其他规则。
  line = line.replace(RE_CHAR_HAN, '$1' + options.pangu_spacing + '$3'); // 汉字在后。

  return output;
}

function lint(text, options) {
  var lines = text.split(/\r\n|\r|\n/);
  var output = [];

  lines.forEach(function(line, index) {
    var lineno = index + 1;
    var out = lintLine(line, lineno, options);
    out.lineno = lineno;
    output = output.concat(out);
  });

  return output;
};

module.exports = pangu;
module.exports.fixup = pangu;
module.exports.lint = lint;
