// generate letter range checkboxes

let letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
let chHtml = '';
letters.forEach(l => {
    chHtml += `<label><input class="inputs inputsFilterLetter" type="checkbox" value="${l}" checked>${l.toUpperCase()}</label> &nbsp;`
})
chHtml += `<button class="btn-default" id="btnDeselect" type="button">Deselect all</button> <button class="btn-default" id="btnSelectAll" type="button">Select all</button>`;


ckeckboxLetters.insertAdjacentHTML('beforeend', chHtml);
let checkboxes = document.querySelectorAll('.inputsFilterLetter');
let letterSelection = [...document.querySelectorAll('.inputsFilterLetter:checked')].map(item => { return item.value });
