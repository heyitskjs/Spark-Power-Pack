var page = 0;
var pageData = [];
var myRooms = [];
var selected = []; // array for tracking item selections when moving between pages
var sparkToken = localStorage.getItem("sparkToken");
var sortMethod = {"id": "created"};
var sortDir = 1; // Ascending
var url = "https://api.ciscospark.com/v1/rooms";
var next = "";
var search = false;
var filter = {direct: ""};

if (localStorage.getItem("max") === null) {
  var max = 10;
}else{
	var max = parseInt(localStorage.getItem("max"));
}

$("#listRooms").on("click", function(){
	$("#intro").remove();
	$(".container").append('<div class="row" id="progress"><div class="col-md-12 text-center"><img src="images/progress-ring.gif"><h3>Loading Data...</h3></div></div>');
	listRooms(next, url); // list my rooms
});


function sendSelected(){
	message = $("#myMessage").val();
	var filename = $("#file")[0].files[0];
	for(var i in selected){
		sendMessage(selected[i].id,message,filename);
	}
}


function getMembershipId(roomId){
	$.ajax({
		url: "https://api.ciscospark.com/v1/messages?roomId="+roomId,
		headers: {'Content-Type': 'application/json', 'Authorization': sparkToken},
		cache: false,
		method: "GET"
	}).done(function(data){
		sendMessage(data.items[0].id,"Hello from from SparkPowerPAK");
	});
}

function sendMessage(roomId,theMessage,filename){
	var form = new FormData();
	form.append("roomId", roomId);
	form.append("markdown", theMessage);
	form.append("files", filename);

	var settings = {
	  "async": true,
	  "cache": false,
	  "crossDomain": true,
	  "url": "https://api.ciscospark.com/v1/messages",
	  "method": "POST",
	  "processData": false,
	  "contentType": false,
	  "mimeType": "multipart/form-data",
	  "data": form,
	  "headers": {
	    "authorization": sparkToken
	  }
	};

	$.ajax(settings).done(function (response) {
	  console.log(response);
	});
	$(".container").html('<div class="jumbotron"><h3>Success!</h3><p>Your message has been broadcasted!</p><button class="btn btn-normal" type="button" onClick="window.location=\'powerpack.php\'"">Home</button></div>');
}

function refreshRooms(){
	pageData = [];
	localStorage.removeItem("roomList");
	$(".container").html('<div class="row" id="progress"><div class="col-md-12 text-center"><img src="images/progress-ring.gif"><h3>Loading Data...</h3></div></div>');
	listRooms(next, url);
}

var next = "";
var url = "https://api.ciscospark.com/v1/rooms";

function listRooms(next,url){
	// check for cached data
	if (localStorage.getItem("roomList")){
		pageData = JSON.parse(localStorage.getItem("roomList"));

		//Check filter options
		var broadcastData = [];
		if(filter.direct !== "checked"){
			for(var i = 0; i < pageData.length; i++){
				if(pageData[i].type != "direct"){
					broadcastData.push(pageData[i]);
				}
			}
			// remove filtered for list for Exodus
			pageData = broadcastData;
		}

		page = localStorage.getItem("page");
		pagination(max);
	}else{
		// check to see if list rooms came back with a "next link"
		if(next.length > 1){
			url = next;
		}else{
			url = url+"?max=100";
		}

		$.ajax({
			url: url,
			headers: {'Content-Type': 'application/json', 'Authorization': sparkToken},
			cache: false,
			method: "GET",
			statusCode: {
				502: function(){
					$("#roomButton").hide();
					$("#step1a").append("<h2>Sorry, we could not access the API. Check the <a href='http://status.ciscospark.com' target='_blank'>Spark Status</a> and try again later.</h2>")

				}
			}
		}).done(function(data, status, xhr){
			//pagination
			pageData.push(data.items);

			//parse the next link from the respone header
			var link = xhr.getResponseHeader('Link');
			if(link){
				var myRegexp = /(http.+)(>)/g;
				var match = myRegexp.exec(link);
				page++;
				// call listRooms again with the next link
				listRooms(match[1], url);
			}else{
				//flatten the pageData array and store in localStorage
				pageData = _.flatten(pageData);
				pageData = sortObjectBy(pageData,"title","A");
				localStorage.setItem("roomList", JSON.stringify(pageData));
				localStorage.setItem("page", page);
				// call the pagiation script
				pagination(max);
			}
		});
	}
}

function sortObjectBy(array, srtKey, srtOrder){
    if (srtOrder =="A"){
        if (srtKey =="title" || srtKey =="name"){
            return array.sort(function (a, b) {
                var x = a[srtKey].toLowerCase(); var y = b[srtKey].toLowerCase();
                return ((x < y) ? -1 : ((x > y) ? 1 : 0));
            });    
        }else{

        return array.sort(function (a, b) {
            var x = a[srtKey]; var y = b[srtKey];
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        });

        }

    }

    if (srtOrder =="D"){
        if (srtKey =="title" || srtKey =="name"){
            return array.sort(function (a, b) {
                var x = a[srtKey].toLowerCase(); var y = b[srtKey].toLowerCase();
                return ((x > y) ? -1 : ((x < y) ? 1 : 0));
            });    
        }else{

        return array.sort(function (a, b) {
            var x = a[srtKey]; var y = b[srtKey];
            return ((x > y) ? -1 : ((x < y) ? 1 : 0));
        });

        }

    }

}


function sortBy(srtValue, srtOrder){
	pageData = sortObjectBy(pageData,srtValue,srtOrder);
	checkSelected();
	pagination(max);
}


function perPage(){
	checkSelected();
	if($("#max").val() > 10){
		max = parseInt($("#max").val());
		localStorage.setItem('max', max);
		if(max > pageData.length){
			max = pageData.length;
		}
	}else{
		max = 10;
	}
	pagination(max);
}


function pagination(max){
	$("#progress").remove();
	//setup page navigation
	var HTML = "<div class='row'><div class='col-md-12'><h2>Select the rooms you want to broadcast to</h2></div></div>";
	$(".container").html(HTML);

	var totalRooms = pageData.length;
	//console.log(totalRooms);
	if(totalRooms <= max){
		var numPages = 1;
		max = totalRooms;
	}else{
		var numPages = (totalRooms / max);
	}

	var HTML = '<div class="row"><div class="col-md-12"><nav style="display: inline-block;"><ul class="pagination">';
	for(var i = 0; i < numPages; i++){
		var start = i * max;
		var stop = start + max-1;
		if(stop > totalRooms){
			stop = totalRooms - 1;
		}
		var pageDisplay = i + 1;
		if (pageDisplay == 1){
			HTML += "<li class='active'><a onClick='roomDisplay("+start+","+stop+")'>"+pageDisplay+"</a></li>";
		}else{
			HTML += "<li><a onClick='roomDisplay("+start+","+stop+")'>"+pageDisplay+"</a></li>";
		}
		
	}

	HTML += '<li><a onClick=\'refreshRooms()\'><i class="glyphicon glyphicon-refresh"></i></a></li>&nbsp;&nbsp;<span><input type="text" placeholder=10 size="3" maxlength="3" id="max">&nbsp;<button class="btn btn-normal btn-sm" id="perPage" type="button" onClick=\'perPage()\'>Per/Page</button></span></nav></div></div>';
	
	if(!search){
		HTML += '<div class="row"><div class="col-md-6"><div class="input-group" id="search"><input type="text" class="form-control" id="searchString" placeholder="Room Name"><div class="input-group-addon" id="liveSearch"><i class="glyphicon glyphicon-search"></i></div></div></div></div>';
	}else{
		HTML += '<div class="row"><div class="col-md-6"><div id="clearSearch"><button class="btn btn-warning btn-sm">Clear Search</button></div></div></div>';
	}

	HTML += '<div class="row"><br><div class="col-md-12"><div class="form-group"><div class="col-md-4"> <label class="checkbox-inline" for="direct"> <input type="checkbox" name="direct" id="direct" value="direct" '+filter.direct+'> Show 1:1</div> </div></div></div> ';
	// insert HTML into container
	$(".container").append(HTML);
	$("#max").attr("placeholder", max);
	
	roomDisplay(0,max-1);
}

function roomDisplay(start,stop){
	checkSelected();

	var table = '<div class="row" id="roomList"><div class="col-md-12"><table class="table table-striped" id="roomTable"><thead><th></th><th width="55%">Room Name <a class="glyphicon glyphicon-sort" id="title"></a></th><th width="20%">Created <a class="glyphicon glyphicon-sort" id="created"></a></th><th width="20%">Last Activity <a class="glyphicon glyphicon-sort" id="lastActivity"></a></th></thead>';

	var data = pageData;
	for(var i = start; i <= stop; i++){
		var checked = false;
		if(selected.length > 0){
			for(var index in selected){
				if(data[i].id == selected[index].id){
					checked = true;
					console.log("checked item");
					break;
				}
			}
		}

		var created = new Date(data[i].created);
		var activity = new Date(data[i].lastActivity);
		var nameDisplay = typeof data[i].teamId === "undefined" ? data[i].title : data[i].title + ' <i class="fa fa-users" aria-hidden="true"></i>';
		if(checked){
			console.log("no selections have been made yet");

			table += '<tr><td><input type="checkbox" name="checkboxes" id="'+data[i].id+'" value="'+data[i].title+'" checked><td>'+nameDisplay+'</td><td>'+created.toLocaleString()+'</td><td>'+activity.toLocaleString()+'</td><td></tr>';
			checked = false;
		}else{
			table += '<tr><td><input type="checkbox" name="checkboxes" id="'+data[i].id+'" value="'+data[i].title+'"><td>'+nameDisplay+'</td><td>'+created.toLocaleString()+'</td><td>'+activity.toLocaleString()+'</td><td></tr>';
		}
		
	}
		$("#roomList").remove();
		$(".container").append(table);

		var button = "</br><button class='btn btn-success' type='button' onclick='reviewSelected()'>Review Selection(s)</button>  <button class='btn btn-normal' type='button' onclick='window.location=\"broadcast.php\"'>Cancel</button>";
		$("#roomTable").after(button);
}



// handle the active page
$(document).on('click', 'li', function() {
   $("li").removeClass("active");
   $(this).addClass("active");
});

$(document).on('click', 'th a', function() {
	if(sortMethod.id == $(this).attr("id") && sortDir == 0){
		sortBy($(this).attr("id"), "A");
		sortDir = 1;
	}else{
		sortBy($(this).attr("id"), "D");
		sortMethod.id = $(this).attr("id");
		sortDir = 0;
	}
});

$(document).on('change', '#direct, #team', function(e){
	if($("#direct").prop('checked')){
		filter.direct = "checked";
	}else{
		filter.direct = "";
	}	
	listRooms();
});

function checkSelected(){
		$("input:not(:checked)").each(function(){
		if(selected.length >= 1){
			for(var i = 0; i < selected.length; i++){
				if(selected[i].id == this.id){
					selected.splice(i, 1);
				}
			}
		}
	});
	// record any selected
	$("input:checked").each(function(){
		var addItem = true;
		if(selected.length > 0){
			for(var i = 0; i < selected.length; i++){
				if(selected[i].id == this.id){
					addItem = false;
				}	
			}
		}

		if(addItem && this.id !== "direct"){
			selected.push(this);
		}
	});
}

function reviewSelected(){
	$("#myMessage").val("")
	checkSelected();

	var HTML = "<h2>Your message will be broadcasted to these rooms</h2>";
	for(index in selected){
		HTML += "<p>"+selected[index].value+"</p>";
	};
	HTML += '<div class="row" id="confirm"><div class="col-md-8"><form id="bcastData" method="post" enctype="multipart/form-data"><textarea class="form-control" style="min-width: 100%" rows="5" id="myMessage" name="message" placeholder="Type your message here" ></textarea><input type="file" name="file" id="file" /></br><button class="btn btn-success" type="submit">Send Message</button><button class="btn btn-warning" id="cancel" type="button" onClick="startOver()">Cancel</button></form></div><div class="col-span-4"><h4>Broadcase now supports markdown. <a href="https://developer.ciscospark.com/formatting-messages.html" target="_blank">Click here</a> for formattting info.</h4></div>';
	$(".container").html(HTML);
}
$(document).on('submit', 'form#bcastData', function(e) {
	e.preventDefault();
	sendSelected();
});

function startOver(){
	selected = [];
	myRooms = [];
	location.reload();
}