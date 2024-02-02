let login = document.querySelector('#tm-login')
let tm_login_form = document.querySelector('#tm_login_form')

// show_search.addEventListener('click', function() {
//     search_dset_div.classList.toggle('display-none');
// })

// login.addEventListener('click', ()=>{
//     tm_login_form.classList.toggle('display-none')
// })

console.log(login);

login.addEventListener('click', ()=>{
    tm_login_form.classList.toggle('display-none');
})