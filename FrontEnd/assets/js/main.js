/*-------------------------------------------------------------------------------
  document ready
-------------------------------------------------------------------------------*/
$(document).ready(function() {

    //ANCORA
    let $doc = $('html, body');
    $('a.link').click(function() {
        $doc.animate({
            scrollTop: $($.attr(this, 'href')).offset().top
        }, 1500);
        return false;
    });

    //MENU
    $('nav ul li a:not(:only-child)').click(function(e) {
        $(this).siblings('.nav-dropdown').toggle();
        $('.nav-dropdown').not($(this).siblings()).hide();
        e.stopPropagation();
    });
    $('#nav-toggle').click(function() {
        $('nav ul.nav-list').slideToggle();
        $('.brand2').slideToggle();
    });
    $('#nav-toggle').on('click', function() {
        this.classList.toggle('active');
    });


    //CAROUSEL
    let owlBanner = $('.owl-banner');
    owlBanner.owlCarousel({
        loop: true,
        margin: 0,
        dots: true,
        nav: false,
        mouseDrag: true,
        autoplay: true,
        navText: ["<div class='nav-btn prev-slide'></div>", "<div class='nav-btn next-slide'></div>"],
        responsive: {
            0: {
                items: 1
            },
            1000: {
                items: 1,
            }
        }
    });

    //CAROUSEL
    let owlProdutos = $('.owl-produtos');
    owlProdutos.owlCarousel({
        loop: true,
        margin: 15,
        dots: false,
        nav: true,
        mouseDrag: true,
        autoplay: false,
        navText: ["<div class='nav-btn prev-slide'></div>", "<div class='nav-btn next-slide'></div>"],
        responsive: {
            0: {
                items: 1,
                stagePadding: 50,
            },
            1000: {
                items: 4,
            }
        }
    });

    $(".underline-box").addClass("ready");
    $(".underline-box h1").each(function(){
        var fullString;
        var characters = $(this).text().split("");
        $this = $(this);
        $this.empty();
        $.each(characters, function (i, el) {
            if(el == " "){el = "&nbsp;"};
            $this.append("<span class='letter'>" + el + "</span");
        });
    });

    //Magnific Popup Video Init
    $('.popup-youtube').magnificPopup({
        disableOn: 700,
        type: 'iframe',
        mainClass: 'mfp-fade',
        removalDelay: 160,
        preloader: false,
        fixedContentPos: false
    });
    // Abre modal de lojas para o botão de whatsapp/ifood
    $('#zap').click(function(i) {
        $('.lojas').addClass('d-block')
        $('.lojas').removeClass('d-none')
    });
    $('#ifood').click(function(i) {
        $('.lojas').addClass('d-block')
        $('.lojas').removeClass('d-none')
    });
    $('a[href$="#modal"]').on("click", function() {
        $('#modal').modal('show');
    });

    /*function hide(elements) {
        elements = elements.length ? elements : [elements];
        for (var index = 0; index < elements.length; index++) {
            elements[index].style.display = 'none';
        }
    }

    var pergunta1 = document.getElementById("pergunta1id");

    pergunta1.addEventListener('click', function() {

        hide(document.querySelectorAll('.resposta'));
        document.getElementById("resposta1id").style.display = "block";

    });

    var pergunta2 = document.getElementById("pergunta2id");

    pergunta2.addEventListener('click', function() {

        hide(document.querySelectorAll('.resposta'));
        document.getElementById("resposta2id").style.display = "block";

    });
    var pergunta3 = document.getElementById("pergunta3id");

    pergunta3.addEventListener('click', function() {

        hide(document.querySelectorAll('.resposta'));
        document.getElementById("resposta3id").style.display = "block";

    });
    var pergunta4 = document.getElementById("pergunta4id");

    pergunta4.addEventListener('click', function() {

        hide(document.querySelectorAll('.resposta'));
        document.getElementById("resposta4id").style.display = "block";

    });
    var pergunta5 = document.getElementById("pergunta5id");

    pergunta5.addEventListener('click', function() {

        hide(document.querySelectorAll('.resposta'));
        document.getElementById("resposta5id").style.display = "block";

    });
    var pergunta6 = document.getElementById("pergunta6id");

    pergunta6.addEventListener('click', function() {

        hide(document.querySelectorAll('.resposta'));
        document.getElementById("resposta6id").style.display = "block";

    }); */
});