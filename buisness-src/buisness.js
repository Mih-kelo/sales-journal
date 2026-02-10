let forextodo = [
  {  launchdate: '2025-10-28', result: null, forextradeurl: '',pnl:''},
  { launchdate: '2025-10-24', result:null,forextradeurl:'',pnl : '' }
];

let newcustomers = 0;
let returningcustomers = 0;

forexshowstorage();// Load from localStorage
recalculateforex() 
forexrendertodo();
showcapital();
totalprofit()

function forexrendertodo() {
  let forextodohtml = '';
  forextodo.forEach((item, i) => {
    const {  launchdate, result ,forextradeurl} = item;
    const forexhtml = `
  <div class = "users-class">   
  
      <div>${launchdate}</div>

      <button onclick="forexmarkwin(${i})"class="win-button">New</button>
      <button onclick="forexmarkloss(${i})" class="loss-button">Returning</button>
       


 <input type="text" name="" id="" placeholder="profit for this sale" class="input-pnl">
        <button class="save-pnl" onclick="tradepnl(${i})">save</button>
        <span class="pnl-display">${item.pnl || ''}</span>
      <button onclick="forexdeletetodo(${i})">Delete</button>

    </div>`;
    forextodohtml += forexhtml;
  });

  document.querySelector('.js-project-list').innerHTML = forextodohtml;
  
 document.querySelectorAll('.input-pnl').forEach((input, index) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        tradepnl(index);
      }
    });
  });
}

function tradepnl(index){
const userpnl = document.querySelectorAll('.input-pnl')[index];

 const trimmedpnl = parseFloat(userpnl.value.trim());

 if (isNaN(trimmedpnl)) {alert('Type in a valid pnl in numerals');
return;
 }
forextodo[index].pnl = trimmedpnl
userpnl.value = '';
forexstored()
forexrendertodo()
totalprofit()

}

function totalprofit(){
  let totalpnl = 0
forextodo.forEach((item)=>
{const  value = parseFloat(item.pnl)
if(!isNaN(value)){totalpnl+= value}
}
)
const displaypnl = document.querySelector('.total-profit-display')
if (totalpnl > 0 ) {displaypnl.innerHTML = `+₦${totalpnl}`}
else if(totalpnl < 0){displaypnl.innerHTML = `-₦${Math.abs(totalpnl)}`}
else{displaypnl.innerHTML = `₦0.00`;
}
}

function forexaddtodo() {
  const forexdate = document.querySelector('.duedate-js');
  const forexduedate = forexdate.value.trim();
  if ( forexduedate === '') {
    alert('Type in project name and date');
return;
  }

  forextodo.push({ launchdate: forexduedate, result: null,pnl:'' });
  
  forexdate.value = '';
recalculateforex()
  forexstored();
  forexrendertodo();
  totalprofit();

}

function forexstored() {
  localStorage.setItem('forextodo', JSON.stringify(forextodo));
  localStorage.setItem('forexwins', forexwins);
  localStorage.setItem('forexloss', forexloss);
}

function forexshowstorage() {
  const forexsavedtodo = localStorage.getItem('forextodo');
  const forexsavedwins = localStorage.getItem('forexwins');
  const forexsavedloss = localStorage.getItem('forexloss');

  if (forexsavedtodo) forextodo = JSON.parse(forexsavedtodo);
  if (forexsavedwins) forexwins = parseInt(forexsavedwins);
  if (forexsavedloss) forexloss = parseInt(forexsavedloss);
}

function forexdeletetodo(i) {
  forextodo.splice(i, 1);
      recalculateforex()
        forexstored();
  forexrendertodo();
totalprofit();
}
function sure(i){
  const proceed = confirm('Are you sure you want to personally delete this sale from your journal?')
  if (proceed){forexdeletetodo(i)};
}
function forexmarkwin(i) {

  forextodo[i].result = 'newcustomers';
      recalculateforex()
        forexstored();
  forexrendertodo();

}

function forexmarkloss(i) {
  forextodo[i].result = 'returningcustomers';
      recalculateforex()
        forexstored();
  forexrendertodo();
weeklygrowth()
}

function forexupdate() {
  document.getElementById('new').textContent = `New customers: ${newcustomers}`;
  document.getElementById('returning').textContent = `Returning customers: ${returningcustomers}`;
}

function forexwinrate() {

  const total = forextodo.length;
  if (total === 0) return alert('No wins yet');
  
  alert(`Your total sales are ${total}, New customers: ${newcustomers}, Returning customers: ${returningcustomers}`);
 
}
function recalculateforex(){
  newcustomers = 0
  returningcustomers = 0
forextodo.forEach(item=>{
if (item.result === 'newcustomers')newcustomers++
if(item.result ==='returningcustomers')returningcustomers++

}) 
forexupdate()
}

function forexdarkmode() {
  const body = document.querySelector('.forexbody');
  body.classList.toggle('dark-mode');
   document.querySelectorAll(`a`).forEach((link)=>{
  link.classList.toggle('link-color')
  }) 
}

function balance(){
 
const usercapital = document.querySelector('.input-capital')
const trimmed = usercapital.value.trim();
 if (!trimmed) return;
document.querySelector('.capital-display').innerHTML=`₦${trimmed}`; 
 usercapital.value = ''
    localStorage.setItem('trimmed',JSON.stringify(trimmed))
}
const entercapital = document.querySelector('.input-capital');
entercapital.addEventListener('keydown',(e)=>{
if (e.key === 'Enter') {
  e.preventDefault()
  balance()
}


}


)
function showcapital(){
 const savedbalance = localStorage.getItem('trimmed')
 if (savedbalance) {document.querySelector('.capital-display').innerHTML = `₦${(JSON.parse(savedbalance))}`
 }
}
