let dialogSelector = "[data-dialog]";
if (document.querySelectorAll(dialogSelector)) {
    //initDialogs(dialogSelector);
}
//alert('dialog')

function initDialog(selector) {

    let dialog = document.querySelector(selector);
    // get transition timings from computed style
    let style = getComputedStyle(dialog);
    let duration = parseFloat(style.getPropertyValue("transition-duration")) * 1000;
    let delay = parseFloat(style.getPropertyValue("transition-delay")) * 1000;

    const closeDialog = (dialog, dialogWrap, duration, delay) => {
        dialogWrap.classList.remove("dialog-active");

        // delay close to enable backdrop transition
        setTimeout(() => {
            dialog.close();
        }, (duration + delay));
    }

    /**
    * add close button if it doesn't exist 
    * (e.g if already added by previous/duplicate dialog targets)
    */
    let dialogBtnClose = dialog.querySelector('.dialog-btn-close');
    if (!dialogBtnClose) {
        dialogBtnClose = document.createElement('button')
        dialogBtnClose.setAttribute('aria-label', 'Close dialog')
        dialogBtnClose.setAttribute('type', 'button')
        dialogBtnClose.classList.add('dialog-btn-close');
        dialogBtnClose.textContent = '×';
        dialog.insertBefore(dialogBtnClose, dialog.children[0])
    }

    // wrap dialog to replace backface with :before pseudo
    let dialogWrap = dialog.closest('.dialog-wrap');
    if (!dialogWrap) {
        dialogWrap = document.createElement('div');
        dialog.parentNode.insertBefore(dialogWrap, dialog);
        dialogWrap.classList.add('dialog-wrap');
        dialogWrap.append(dialog);
    }

    // add content wrap
    let dialogCntWrp = dialog.querySelector('.dialog-content');
    if(!dialogCntWrp){
        dialogCntWrp = document.createElement('div');
        dialogCntWrp.classList.add('dialog-content');
        dialog.append(dialogCntWrp)
    }



    // "Close" button closes the dialog
    dialogBtnClose.addEventListener("click", () => {
        closeDialog(dialog, dialogWrap, duration, delay);
    });

    // close on backdrop click
    dialog.addEventListener("click", (e) => {
        //get bounding box to close dialog when clicking outside dialog box
        let {
            left,
            top,
            right,
            bottom,
            width,
            height
        } = dialog.getBoundingClientRect();

        if (dialog.open) {
            let pt = { x: e.clientX, y: e.clientY };
            // is outsite bbox
            if (pt.x > right || pt.x < left || pt.y > bottom || pt.y < top) {
                closeDialog(dialog, dialogWrap, duration, delay);
            }
        }
    });

}


function openDialog(selector, dialogSrc) {

    let dialog = document.querySelector(selector);
    dialog.showModal();
    let dialogWrap = dialog.closest('.dialog-wrap')
    dialogWrap.classList.add("dialog-active");
    let dialogCntWrp = dialog.querySelector('.dialog-content');

    if (dialogSrc) {
        //load external content
        let dialogContent = `
        <iframe class="brd-non iframe-dialog wdt-100 min-hgt-75vh" src="${dialogSrc}"></iframe>`;
        dialogCntWrp.innerHTML = dialogContent;
    }
}

function bindDialogBtns(selector){
    let dialogLinks = sectionFavs.querySelectorAll('[data-dialog]');
    dialogLinks.forEach(dialogBtn=>{
        dialogBtn.addEventListener('click', (e)=>{
            e.preventDefault();
            let dataSrc = e.currentTarget.dataset['dialogSrc'];
            openDialog(selector, dataSrc)
        })
    })
}


function initDialogs(dialogSelector = "[data-dialog]") {
    let dialogBtns = document.querySelectorAll(dialogSelector);
    if (!dialogBtns.length) return false;


    const closeDialog = (dialog, dialogWrap, duration, delay) => {
        dialogWrap.classList.remove("dialog-active");

        // delay close to enable backdrop transition
        setTimeout(() => {
            dialog.close();
        }, (duration + delay));
    }

    dialogBtns.forEach((dialogBtn) => {
        // query target dialog from button
        let dialog = document.querySelector(dialogBtn.dataset.dialog);
        // fallback take first dialog element
        dialog = dialog ? dialog : document.querySelector('dialog');

        // no dialog - exit
        if (!dialog) return false;

        /**
         * load dialog source
         * in iframe
         */

        let dialogSrc = dialogBtn.dataset.dialogSrc;
        if (dialogSrc) {

            //load external content
            let dialogContent = `
        <iframe class="brd-non iframe-dialog wdt-100 min-hgt-75vh" src="${dialogSrc}"></iframe>`;
            dialog.innerHTML = dialogContent;
        }


        /**
        * add close button if it doesn't exist 
        * (e.g if already added by previous/duplicate dialog targets)
        */
        let dialogBtnClose = dialog.querySelector('.dialog-btn-close');
        if (!dialogBtnClose) {
            dialogBtnClose = document.createElement('button')
            dialogBtnClose.setAttribute('aria-label', 'Close dialog')
            dialogBtnClose.setAttribute('type', 'button')
            dialogBtnClose.classList.add('dialog-btn-close');
            dialogBtnClose.textContent = '×';
            dialog.insertBefore(dialogBtnClose, dialog.children[0])
        }


        // wrap dialog to replace backface with :before pseudo
        let dialogWrap = dialog.closest('.dialog-wrap');
        if (!dialogWrap) {
            dialogWrap = document.createElement('div');
            dialog.parentNode.insertBefore(dialogWrap, dialog);
            dialogWrap.classList.add('dialog-wrap');
            dialogWrap.append(dialog);
        }

        // get transition timings from computed style
        let style = getComputedStyle(dialog);
        let duration = parseFloat(style.getPropertyValue("transition-duration")) * 1000;
        let delay = parseFloat(style.getPropertyValue("transition-delay")) * 1000;

        // open dialog modally
        dialogBtn.addEventListener("click", (e) => {
            e.preventDefault();
            dialog.showModal();
            dialogWrap.classList.add("dialog-active");
        });


        // "Close" button closes the dialog
        dialogBtnClose.addEventListener("click", () => {
            closeDialog(dialog, dialogWrap, duration, delay);
        });

        // close on backdrop click
        dialog.addEventListener("click", (e) => {
            //get bounding box to close dialog when clicking outside dialog box
            let {
                left,
                top,
                right,
                bottom,
                width,
                height
            } = dialog.getBoundingClientRect();

            if (dialog.open) {
                let pt = { x: e.clientX, y: e.clientY };
                // is outsite bbox
                if (pt.x > right || pt.x < left || pt.y > bottom || pt.y < top) {
                    closeDialog(dialog, dialogWrap, duration, delay);
                }
            }
        });
    });
}
