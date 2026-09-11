import React, { useRef } from 'react';
import template from '/public/template.json';
import EmailEditor from 'react-email-editor';

const App = (props) => {
  const emailEditorRef = useRef(null);

  const exportButton = document.getElementById("export-button");
  exportButton.addEventListener("click", async () => {
      await emailEditorRef.current.editor.exportHtml(function (data) {
          const { html } = data;
          const today = new Date().toISOString().slice(0, 10);
          const filename = `plantilla-${today}.html`;
          const element = document.createElement("a");
          const file = new Blob([html], { type: "text/html" }); 
          element.href = URL.createObjectURL(file);
          element.download = filename;
          element.click();
      });
  });


  
  //Export HTML Minify 
const exportMinifyButton = document.getElementById("export-button-minify");
exportMinifyButton.addEventListener("click", async () => {
  await emailEditorRef.current.editor.exportHtml(function (data) {
    //Limpia los datos y exporta el html en una sola linea 

      const { html } = data;
      const htmlMinify = html
          .replace(/\n/g, '')             
          .replace(/\s\s+/g, ' ')          
          .trim();       

      const today = new Date().toISOString().slice(0, 10);
      const filename = `plantilla-${today}-Minify.html`;
      const element = document.createElement("a");
      const file = new Blob([htmlMinify], { type: "text/html" });
      element.href = URL.createObjectURL(file);
      element.download = filename;
      element.click();
  });
});



// Save JSON 
const saveJson = document.getElementById("save-button");
saveJson.addEventListener("click", async () => {
	await  emailEditorRef.current.editor.saveDesign(function (data) {
		const { design } = data;
		const today = new Date().toISOString().slice(0, 10);
		const filename = `plantilla-${today}.json`;
		const element = document.createElement("a");
		const file = new Blob([JSON.stringify(data)],{type: "json/plain",});
		element.href = URL.createObjectURL(file);
		element.download = filename;
		element.click();
	});
});



// Cerrar el modal cuando se haga clic en los botones de cerrar
document.querySelectorAll('[data-modal-hide="popup-modal"]').forEach(button => {
    button.addEventListener("click", () => {
        const modal = document.getElementById("popup-modal");
        modal.classList.add("hidden");
    });
});

  //Redireccion 
  const redirect = document.getElementById("home");

redirect.addEventListener("click", async() =>{
window.location = "/";
});

    //IMPORTAR json 
    const importJson = document.getElementById("import-button");
importJson.addEventListener("click", async () => {
  loadDesign();
});



const loadDesign = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const design = JSON.parse(event.target.result);
        emailEditorRef.current.editor.loadDesign(design);
      };
      reader.Blob(file);
    };
    fileInput.click();
  };
  
  return (
    <div className='w-full h-[80%]' >
      
      <EmailEditor
      
       minHeight={900}
        options={{

          displayMode: "email",
          features: {
            stockImages: true
          },
          id: "dy-email-editor"
        }}
        projectId={276321}
        ref={emailEditorRef}
      />
      
    </div>
  );
};

export default App;