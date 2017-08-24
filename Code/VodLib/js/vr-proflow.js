"use strict";

let filmsPerCategory = new Map();

const placeholderImage = "css/img/thumb-placeholder.jpg";

let movies = ["city-4096-mp4-30fps-x264-ffmpeg.mp4"];
let next_mov = 0;

function createCategory(category) {
	let section = document.createElement("section");
	section.dataset["pattern"] = "swipe";
	section.id = category.id;
	addClass(section, "modList");
	addClass(section, "vods");
	addClass(section, "carouselActive");
	section.innerHTML = "" +
		"<header class=\"carouselheader\" hover='hover' onclick='collapsCategory(\""+ category.id +"\",this)'>" +
		"\t<span data-tip=\"0 films\">" + category.name + "</span>" +
		"\t<div class=\"collaps-img\"></div>" +
		"</header>" +
		"<div id=\"car-main"+ category.id +"\" class=\"main carouselMain\">" +
		"\t<div style='overflow: hidden;' class=\"carouselWrapper\" data-id=\"" + category.id + "\"></div>" +
		"</div>" +
		"<header>" +
		"\t<div class=\"pager\">" +
		"\t\t<a href=\"#\" class=\"prev disabled\" hover=\"prevhover\" style=\"--vr-z: 0.01;\"  onclick=\"(function(e){moveCarousel(e,'" + category.id + "',-1);return false;})(event)\"></a>" +
		"\t\t<a href=\"#\" class=\"next\" hover=\"nexthover\" style=\"--vr-z: 0.01;\" onclick=\"(function(e){moveCarousel(e,'" + category.id + "',1);return false;})(event)\"></a>" +
		"\t</div>" +
		"</header>";

	return section;
}

function collapsCategory(element,domel){
	var list = document.getElementById(element).classList; 
	if(list.contains("collaps")){
		list.remove("collaps"); 
		list.add("decollaps");
		document.getElementById("car-main"+ element).addEventListener("animationend", 
															function(){
																document.getElementById(element).classList.remove("decollaps");
															});
	}else{
		list.remove("decollaps");
		list.add("collaps");
	}
}

function createArticle(film) {
	let article = document.createElement("article");
	article.dataset["vodId"] = film["standardid"];
	article.dataset["type"] = "vod";
	article.setAttribute("itemscope", "itemscope");
	addClass(article, "vod");
	addClass(article, "thumb");
	article.innerHTML = "\t<img onclick=\"openVodPopup(" + article.dataset["vodId"] + ");\" hover='hover' return false;\" src=\"" + film["imageposter"] + "\" onerror=\"this.onerror = null; this.src='" + placeholderImage + "';\" alt=\"" + film["title"] + "\">";

	return article;
}

function addArticleToCategory(cat_id, film) {
	document.getElementById(cat_id).getElementsByClassName("carouselWrapper")[0].appendChild(createArticle(film));
}

function showFilms(categoryId) {
	let categoryData = filmsPerCategory.get(categoryId);
	if ( categoryData && categoryData.films ) {
		let films = categoryData["films"];
		let loaded_until = categoryData["loaded_until"];
		let start = categoryData["carousel_start_art"];
		let last = films.length - 1;
		if ( loaded_until < last ) {
			for ( let i = loaded_until + 1; i <= last; ++i ) {
				addArticleToCategory(categoryId, films[i]);
			}
			categoryData["loaded_until"] = last;
		}
	}
}

function storeFilms(categoryId, data) {
	let categoryData = {
		"films": data,
		"loaded_until": -1,
		"carousel_start_art": 0
	};
	filmsPerCategory.set(categoryId, categoryData);

	let section = document.getElementById(categoryId);
	if ( section ) {
		let containerDiv = section.getElementsByClassName("carouselWrapper")[0];
		if ( containerDiv ) {
			//containerDiv.style.width = (data.length * articleWidth) + "px";
		} else {
			console.error("Can't find 'carouselWrapper' div of category id " + categoryId);
		}
	} else {
		console.error("Can't find section of category id " + categoryId);
	}
}

function truncate(str, len) {
	if ( str.length > len + 3 ) {
		str = str.substr(0, len);
		str = str.substr(0, str.lastIndexOf(" "));
		if ( str.lastIndexOf("\n") > len * .7 ) {
			str = str.substr(0, str.lastIndexOf("\n"));
		}
		str += "&hellip;";
	}

	return str;
}

function addIconForFilmPopup(iconName) {
	return "" +
		"\t\t\t\t\t<li>" +
		"\t\t\t\t\t\t<div class=\"image\">" +
		"\t\t\t\t\t\t\t<div class=\"graphic\">" +
		"\t\t\t\t\t\t\t\t<img src=\"media/" + iconName + ".svg\">" +
		"\t\t\t\t\t\t\t</div>" +
		"\t\t\t\t\t\t</div>" +
		"\t\t\t\t\t</li>";
}

function addSpecsForFilmPopup(label, spec) {
	if ( !spec ) {
		return "";
	}
	if ( spec.constructor === Array ) {
		spec = spec.join(", ");
	}
	if ( typeof spec !== "string" && typeof spec !== "number" ) {
		return "";
	}

	return "" +
		"\t\t\t\t\t<div class=\"spec\">" +
		"\t\t\t\t\t\t<p class=\"label\">" + label + "</p>" +
		"\t\t\t\t\t\t<p class=\"value\">" + spec + "</p>" +
		"\t\t\t\t\t</div>";
}

function createPopupArticle(film) {
	if ( !film["imageposter"] ) {
		film["imageposter"] = placeholderImage;
	}
	let iconFlags = film["kijkwijzer"];
	let icons = "";
	if ( iconFlags ) {
		if ( iconFlags & 64 ) {
			icons += addIconForFilmPopup("all-ages");
		} else if ( iconFlags & 128 ) {
			icons += addIconForFilmPopup("6plus");
		} else if ( iconFlags & 256 ) {
			icons += addIconForFilmPopup("12plus");
		} else if ( iconFlags & 512 ) {
			icons += addIconForFilmPopup("16plus");
		} else if ( iconFlags & 1024 ) {
			icons += addIconForFilmPopup("18plus");
		}
		if ( iconFlags & 1 ) {
			icons += addIconForFilmPopup("violence");
		}
		if ( iconFlags & 4 ) {
			icons += addIconForFilmPopup("fear");
		}
		if ( iconFlags & 32 ) {
			icons += addIconForFilmPopup("rude-language");
		}
		if ( iconFlags & 2 ) {
			icons += addIconForFilmPopup("sex");
		}
		if ( iconFlags & 8 ) {
			icons += addIconForFilmPopup("drugs");
		}
		if ( iconFlags & 16 ) {
			icons += addIconForFilmPopup("discrimination");
		}
	}
	let duration = "";
	if ( film["proplength"] ) {
		duration += Math.round(film["proplength"] / 60.0) + " min";
	}
	let divEl = document.createElement("div");
	addClass(divEl, "main");
	divEl.innerHTML =
		"<article itemtype=\"http://schema.org/CreativeWork\" itemscope=\"itemscope\" class=\"vod overlay fadein\" >" +
		"\t<header>" +
		"\t\t<div class=\"titleWrap\">" +
		"\t\t\t<h1 itemprop=\"name\">" + film["title"] + "</h1>" +
		"\t\t</div>" +
		"\t</header>" +
		"\t<div class=\"main\">" +
		"\t\t<div class=\"scrollThumb\"></div>" +
		"\t\t<div class=\"wrap\">" +
		"\t\t\t<div class=\"image thumb\">" +
		"\t\t\t\t\t<img src=\"" + film["imageposter"] + "\" onerror=\"this.onerror = null; this.src='" + placeholderImage + "';\" alt=\"" + film["title"] + "\">" +
		"\t\t\t</div>" +
		"\t\t\t<div class='popupinfo'>"+
		"\t\t\t<section class=\"fiche info\">" +
		addSpecsForFilmPopup("Regie: ", film["directors"]) +
		addSpecsForFilmPopup("Duur: ", duration) +
		addSpecsForFilmPopup("Jaar: ", film["yearofproduction"]) +
		addSpecsForFilmPopup("Genre: ", film["genre"]) +
		addSpecsForFilmPopup("Taal: ", film["mainlanguage"]) +
		addSpecsForFilmPopup("Cast: ", film["actors"]) +
		"\t\t\t</section>" +
		"\t\t\t<div class=\"iconList\">" +
		"\t\t\t\t<ul>" + icons + "</ul>" +
		"\t\t\t</div>" +
		"\t\t\t<div class=\"actions\">" +
		"\t\t\t</div>" +
		"\t\t</div>" +
		"\t\t<section itemprop=\"description\" class=\"textblock description\">" +
		"\t\t\t<p>" + truncate(film["synopsisshort"], 270) + "</p>" +
		"\t\t\t<div class='speelnuknop' hover='hover' play-video='video/"+ movies[(++next_mov%movies.length)] +"' onclick=\"startPlayer(); return false;\" class=\"lnkMore\">" +
		"\t\t\t</div>" +
		"\t\t</section>" +
		"\t</div>" +
		"</article>";

	divEl.setAttribute("onclick","closeVodPopup();");

	return divEl;
}

function closeOnEsc(event) {
	if ( event.keyCode === 27 ) {
		closeVodPopup();
	}
}

function openVodPopup(vodId) {
	console.log("open VOD, id=" + vodId);
	addClass(document.getElementsByTagName("html")[0], "jPop");
	let overlayVod = document.getElementById("ovrVOD");

	let filmDataUrl = "json/film_" + vodId + ".json";
	loadJSON(filmDataUrl).then(function (filmData) {
		while ( overlayVod.lastChild ) {
			overlayVod.removeChild(overlayVod.lastChild);
		}
		overlayVod.appendChild(createPopupArticle(filmData));
	}, function (error) {
		console.error("Failed to download " + filmDataUrl + ":", error);
	});

	window.addEventListener("keydown", closeOnEsc, false);
}

function closeVodPopup() {
	if ( playerShown ) {
		stopPlayer();
		return;
	}
	let overlayVod = document.getElementById("ovrVOD");
	while ( overlayVod.lastChild ) {
		overlayVod.removeChild(overlayVod.lastChild);
	}
	window.removeEventListener("keydown", closeOnEsc, false);
}

let player = null;
let playerElem = null;
let playerShown = false;
function initPlayer() {
	if ( !player ) {
		if ( !dashjs ) {
			console.error("[initPlayer] Dash.js code not (yet) available.");
			return;
		}
		playerElem = document.getElementById("videoPlayer");
		if ( !playerElem ) {
			console.error("[initPlayer] Failed to find 'videoPlayer' element.");
			return;
		}
		player = dashjs.MediaPlayer().create();
		player.initialize();
		player.attachView(playerElem);
	}
}

function startPlayer(url = "sintel/sintel.mpd") {
	initPlayer();
	if ( !player ) {
		console.error("[startPlayer] No player available to start. Call 'initPlayer' first.");
		return;
	}

	player.attachSource(url);
	player.play();
	addClass(playerElem, "active");
	playerShown = true;
	addClass(document.getElementById("ovrVOD"), "playerActive");
}

function stopPlayer() {
	if ( !player ) {
		console.error("[stopPlayer] No player to stop.");
		return;
	}
	if ( player.isReady() ) {
		player.pause();
	}
	removeClass(playerElem, "active");
	playerShown = false;
	removeClass(document.getElementById("ovrVOD"), "playerActive");
}

function addClass(element, className) {
	if ( element.classList ) {
		element.classList.add(className);
	} else {
		if ( (" " + element.className + " ").indexOf(" " + className + " ") === -1 ) {
			element.className += " " + className;
		}
	}
}

function removeClass(element, className) {
	if ( element.classList ) {
		element.classList.remove(className);
	} else {
		element.className = element.className.replace(new RegExp(className, "g"), "").trim().replace(/\s{2,}/g, " ");
	}
}

function loadJSON(url) {
	return new Promise(function (resolve, reject) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function () {
			if ( xhr.readyState === XMLHttpRequest.DONE ) {
				if ( xhr.status === 200 ) {
					resolve(JSON.parse(xhr.responseText));
				} else {
					reject(new Error("Request failed with status: " + xhr.status));
				}
			}
		};
		xhr.open("GET", url, true);
		xhr.send();
	});
}


function init() {
	loadJSON("json/categories.json").then(function (categories) {
		let sequence = Promise.resolve();
		let parallelPromises = [];

		let categoryContainer = document.getElementById("posters");

		for ( let categoryId in categories ) {
			if ( categories.hasOwnProperty(categoryId) ) {

				let category = categories[categoryId];
				category["id"] = categoryId;
				categoryContainer.appendChild(createCategory(category));
				let categoryPromise = sequence;
				categoryPromise = categoryPromise.then(function () {
					return loadJSON("json/category_" + category["id"] + ".json");
				}).then(function (categoryData) {
					storeFilms(category["id"], categoryData);
					showFilms(category["id"]);
				}).catch(function (error) {
					console.error("Downloading data for category " + category["id"] + " failed:", error);
				});

				sequence = categoryPromise;
			}
		}


		
		return sequence;
	}).catch(function (error) {
		console.error("Failed to download 'json/categories.json':", error);
	});

}

if ( document.readyState === "loading" ) {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
