$(function() {

  $('.selectpermissions').on('change', function(){
    var newPermission = $(this).find("option:selected").val();
    var usernameSib = $(this).parent().parent().siblings( ".username");
    var emailSib = $(this).parent().parent().siblings( ".email");
    console.log( usernameSib );
    console.log( emailSib );
    var payload = {
    		username      : usernameSib[0].innerHTML,
    		email  		  : emailSib[0].innerHTML,
    		permissions	  : newPermission
    };
    console.log( payload );
    $.post("/api/memberupdate", {data: payload}, function(result){
        // $("span").html(result);
        console.log( result );
        window.location.reload(true); // <- is this needed? Seems like it would overide the redirect work we're doing on the server
    });
  });

});
