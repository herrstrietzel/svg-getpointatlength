adjustDasharrays();

function adjustDasharrays() {
  let els = document.querySelectorAll(".responsive-dash");

  const resizeGaps = (el, dashL, gapL) =>{
    // get current length
    let len = el.getTotalLength();

    // match to length
    let dashGap = dashL + gapL;
    let divisions = Math.ceil(len / dashGap);
    let abs = dashGap * divisions;
    let diff = len - abs;
    let shorten = 1 + (1 / len) * diff;
    el.setAttribute("stroke-dasharray", `${dashL * shorten} ${gapL * shorten}`);
  }

  els.forEach((el) => {
    let style = window.getComputedStyle(el);
    let strokeDasharray = style
      .getPropertyValue("stroke-dasharray")
      .split(",")
      .map((val) => {
        return parseInt(val);
      });
    let [dashL, gapL] = strokeDasharray;

    // init
    resizeGaps(el, dashL, gapL);

    //resize observer
    const resizeObserver = new ResizeObserver(() => {
      resizeGaps(el, dashL, gapL);
    });
    resizeObserver.observe(el);
  });

}