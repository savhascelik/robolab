/**
 * Pure C++ / Arduino Sketch Syntax Highlighter.
 */
export function highlightCppLine(line = '') {
  const escaped = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (escaped.trim().startsWith('//') || escaped.trim().startsWith('#include')) {
    return `<span class="tok-cmt">${escaped}</span>`;
  }

  const [codePart, commentPart] = escaped.split('//');
  const highlighted = codePart
    .replace(/\b(void|int|long|float|bool|const|char|Servo|WiFi)\b/g, '<span class="tok-kw">$1</span>')
    .replace(
      /\b(setup|loop|pinMode|digitalWrite|digitalRead|analogRead|analogWrite|ledcAttach|ledcWrite|delay|map|pulseIn|tone|Serial|begin|println|attach|write|status|localIP|RSSI)\b/g,
      '<span class="tok-fn">$1</span>'
    )
    .replace(/\b(HIGH|LOW|OUTPUT|INPUT|INPUT_PULLUP|LED_BUILTIN|WL_CONNECTED|A0|GPIO2|GPIO4|GPIO34)\b/g, '<span class="tok-const">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="tok-num">$1</span>');

  return commentPart !== undefined
    ? `${highlighted}<span class="tok-cmt">//${commentPart}</span>`
    : highlighted;
}
