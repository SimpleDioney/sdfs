$(document).ready(function() {
    $('.filtroIngredienteTodos').css("display", "none");
    $('#filtroIngredienteTodos').css("display", "block");
    $('.fritos-lista').css("display", "none");
    $('.assados-lista').css("display", "none");
});

function showFritos() {
    $('.listaCategoria button.btn').removeClass('btnActive');
    $('.btn-frito').addClass('btnActive');

    $('.filtroIngredienteTodos').css("display", "none");
    $('#filtroIngredienteFritos').css("display", "block");

    $('.todossalgados-lista').hide(200);
    $('.all').hide(200);
    $('.fritos-lista').show(500);
}

function showAssados() {
    $('.listaCategoria button.btn').removeClass('btnActive');
    $('.btn-assado').addClass('btnActive');

    $('.filtroIngredienteTodos').css("display", "none");
    $('#filtroIngredienteAssados').css("display", "block");

    $('.todossalgados-lista').hide(200);
    $('.all').hide(200);
    $('.assados-lista').show(500);
}

//--------------------------------------------------------------------------------
//FILTRO SALGADOS
$(document).ready(function() {

    //TODOS
    $('select#filtroIngredienteTodos').focus(function(e) {
        $('.bolos .todossalgados-lista').isotope();
    });
    $('select#filtroIngredienteTodos').change(function(e) {
        var filterValueTodos = $(this).val();
        console.log(filterValueTodos);

        $('.bolos .todossalgados-lista').isotope({ filter: filterValueTodos });
    });

    //FRITOS
    $('select#filtroIngredienteFritos').focus(function(e) {
        $('.bolos .fritos-lista').isotope();
    });
    $('select#filtroIngredienteFritos').change(function(e) {
        var filterValueFritos = $(this).val();
        console.log(filterValueFritos);

        $('.bolos .fritos-lista').isotope({ filter: filterValueFritos });
    });

    //ASSADOS
    $('select#filtroIngredienteAssados').focus(function(e) {
        $('.bolos .assados-lista').isotope();
    });
    $('select#filtroIngredienteAssados').change(function(e) {
        let filterValueAssados = $(this).val();
        console.log(filterValueAssados);

        $('.bolos .assados-lista').isotope({ filter: filterValueAssados });
    });
});
