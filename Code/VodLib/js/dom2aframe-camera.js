//Camera class for easier camera manipulation
class Camera{

	constructor(body_width){
		//Camera gets placed to show the page directeley
		this.aelement = document.createElement("a-camera");
		//The z distance gets calculated with a/sin(A) = c/sin(C) where c is the z distance and a the body width / 2, A = 50° C = 40°
		this.camera_distance = 0.50;//((body_width/2)*0.64278760968653932632264340990726343290755988420568179032)/0.76604444311897803520239265055541667393583245708039524585;
		this.aelement.setAttribute("user-height", "0");
		this.aelement.setAttribute("fov", "80");
		this.aelement.setAttribute("far", "10000");
		this.aelement.setAttribute("near", "0.01");
		this.aelement.setAttribute("stereocam","eye:left;");
		this.aelement.setAttribute("wasd-controls-enabled", "true");
		this.setPosition({x: (body_width/2), y: (-body_width/4), z:this.camera_distance});

		//Cursor
		this.cursor = document.createElement("a-cursor");
		//cursor.setAttribute("fuse",true);
		this.cursor.setAttribute("fuse-timeout",500);
		this.cursor.setAttribute("position", "0 0 -0.1");
		this.cursor.setAttribute("size", "0.1");
		this.cursor.setAttribute("color","green");
		this.cursor.setAttribute("geometry", "primitive: ring; radiusInner: 0.0005; radiusOuter: 0.001")
		this.cursor.setAttribute("raycaster","objects: .clickable; far: 90;")
		this.aelement.appendChild(this.cursor);
		

		//Cursor animations, triggers an animation and thus updateall. Thats why it is in comments
		/*click_animation = document.createElement("a-animation");
		click_animation.setAttribute("begin","click");
		click_animation.setAttribute("easing", "ease-in");
	    click_animation.setAttribute("dur", "150");
		click_animation.setAttribute("attribute", "scale");
		click_animation.setAttribute("fill", "backwards");
		click_animation.setAttribute("from", "0.1 0.1 0.1");
		click_animation.setAttribute("to", "1 1 1");
	    click_animation.setAttribute("repeat", "1");
		cursor.appendChild(click_animation);

		fuse_animation = document.createElement("a-animation");
		fuse_animation.setAttribute("begin","cursor-fusing");
		fuse_animation.setAttribute("easing", "ease-in");
	    fuse_animation.setAttribute("dur", "150");
		fuse_animation.setAttribute("attribute", "scale");
	    fuse_animation.setAttribute("direction", "alternate");
		fuse_animation.setAttribute("fill", "forwards");
		fuse_animation.setAttribute("from", "1 1 1");
		fuse_animation.setAttribute("to", "0.1 0.1 0.1");
	    fuse_animation.setAttribute("repeat", "1");
		cursor.appendChild(fuse_animation);*/
	}

	getAElement(){
		return this.aelement;
	}

	getPosition(){
		return this.aelement.getAttribute("position");
	}

	setPosition(position){
		this.aelement.setAttribute("position", position);
	}

	setMovable(bool){
		this.camera.setAttribute("wasd-controls-enabled",bool);
	}

	isMovable(){
		return this.camera.getAttribute("wasd-controls-enabled") == "true";
	}

	setClickableClasses(classes){
		if(classes)
			this.cursor.setAttribute("raycaster","objects:"+ classes +"; far: 90;");
		else
			this.clearClickableClasses();
	}

	clearClickableClasses(){
		this.cursor.setAttribute("raycaster","objects:; far: 90;");
	}

	getCameraDistance(){
		return this.camera_distance;
	}
}