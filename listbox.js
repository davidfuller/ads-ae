
const pageWorkDetailsFolderUNC ='\\\\alpaca\\dropbox\\Development\\Node\\StreamMasterHelper\\JSON\\'

function fillListbox(pages){
  let theSearch = document.querySelector(".search").value;
  console.log(theSearch)
  emptyListBox();
  let select = document.getElementById("pageChoice");
  for(let i = 0; i < pages.length; i++) {
    let page = pages[i];
    if (page.pageName.toLowerCase().includes(theSearch.toLowerCase())){
      var element = document.createElement("option");
      element.textContent = page.pageName
      element.value = page.txPageNumber
      select.appendChild(element);
    }
  }
}

async function getThePages(){
  let pages = await command.getPageNumberAndNameDetails(pageWorkDetailsFolderUNC);
  return pages;
}

function emptyListBox(){
  let select = document.getElementById("pageChoice");
  while (select.hasChildNodes()) {
    select.removeChild(select.firstChild);
  }
}
  



/*
  // Look for any elements with the class "page-select": 
  let pageSelectElements = document.getElementsByClassName("page-select");
  let pageSelectElementsLength = pageSelectElements.length;
  for (let i = 0; i < pageSelectElementsLength; i++) {
    let selectElements = pageSelectElements[i].getElementsByTagName("select")[0];
    let selectElementsLength = selectElements.length;
    // For each element, create a new DIV that will act as the selected item: 
    let theDiv= document.createElement("DIV");
    theDiv.setAttribute("class", "select-selected");
    theDiv.innerHTML = selectElements.options[selectElements.selectedIndex].innerHTML;
    pageSelectElements[i].appendChild(theDiv);
    // For each element, create a new DIV that will contain the option list: 
    let anotherDiv = document.createElement("DIV");
    anotherDiv.setAttribute("class", "select-items select-hide");
    for (let j = 1; j < selectElementsLength; j++) {
      // For each option in the original select element,
      //create a new DIV that will act as an option item: 
      let optionDiv = document.createElement("DIV");
      optionDiv.innerHTML = selectElements.options[j].innerHTML;
      optionDiv.addEventListener("click", function(e) {
          // When an item is clicked, update the original select box,
          //and the selected item: 
          let selectTags = this.parentNode.parentNode.getElementsByTagName("select")[0];
          let selectTagsLength = selectTags.length;
          let previousSib = this.parentNode.previousSibling;
          for (let i = 0; i < selectTagsLength; i++) {
            if (selectTags.options[i].innerHTML == this.innerHTML) {
              selectTags.selectedIndex = i;
              previousSib.innerHTML = this.innerHTML;
              let sameAsSelecteds = this.parentNode.getElementsByClassName("same-as-selected");
              let sameAsSelectedsLength = sameAsSelecteds.length;
              for (let k = 0; k < sameAsSelectedsLength; k++) {
                sameAsSelecteds[k].removeAttribute("class");
              }
              this.setAttribute("class", "same-as-selected");
              break;
            }
          }
          previousSib.click();
      });
      anotherDiv.appendChild(optionDiv);
    }
    pageSelectElements[i].appendChild(anotherDiv);
    theDiv.addEventListener("click", function(theClick) {
      // When the select box is clicked, close any other select boxes,
      //and open/close the current select box: 
      theClick.stopPropagation();
      closeAllSelect(this);
      this.nextSibling.classList.toggle("select-hide");
      this.classList.toggle("select-arrow-active");
    });
  }

  function closeAllSelect(theElement) {
    // A function that will close all select boxes in the document,
    //except the current select box: 
    let arrowNumber = [];
    let selectedItems = document.getElementsByClassName("select-items");
    let selectSelecteds = document.getElementsByClassName("select-selected");
    let selectedItemsLength = selectedItems.length;
    let selectSelectedsLength = selectSelecteds.length;
    for (let i = 0; i < selectSelectedsLength; i++) {
      if (theElement == selectSelecteds[i]) {
        arrowNumber.push(i)
      } else {
        selectSelecteds[i].classList.remove("select-arrow-active");
      }
    }
    for (let i = 0; i < selectedItemsLength; i++) {
      if (arrowNumber.indexOf(i)) {
        selectedItems[i].classList.add("select-hide");
      }
    }
  }

  // If the user clicks anywhere outside the select box,
  then close all select boxes: 
  document.addEventListener("click", closeAllSelect); 
  */


