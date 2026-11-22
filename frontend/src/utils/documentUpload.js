export const documentAccept = ".pdf,.png,.jpg,.jpeg,.txt";
const maxBytes = 10 * 1024 * 1024;

const documentTypes = {
   pdf: "application/pdf",
   png: "image/png",
   jpg: "image/jpeg",
   jpeg: "image/jpeg",
   txt: "text/plain",
};

export function documentType(filename) {
   if (!filename.includes(".")) return undefined;
   const extension = filename.split(".").pop().toLowerCase();
   return Object.hasOwn(documentTypes, extension) ? documentTypes[extension] : undefined;
}

export function uploadIssue(file) {
   if (!documentType(file.name)) return "fileType";
   if (!file.size) return "empty";
   if (file.size > maxBytes) return "tooLarge";
   return null;
}

export function uploadErrorMessage(issue, t) {
   const messages = {
      fileType: t("Choisissez un fichier PDF, JPG, PNG ou TXT.", "Choose a PDF, JPG, PNG, or TXT file.", "اختر ملف PDF أو JPG أو PNG أو TXT."),
      empty: t("Le fichier est vide.", "The file is empty.", "الملف فارغ."),
      tooLarge: t("Le fichier dépasse la limite de 10 Mo.", "The file exceeds the 10 MB limit.", "يتجاوز الملف الحد البالغ 10 ميغابايت."),
      network: t("Connexion au serveur impossible.", "Could not reach the server.", "تعذر الاتصال بالخادم."),
      upload: t("Le serveur n’a pas pu enregistrer le fichier.", "The server could not save the file.", "تعذر على الخادم حفظ الملف."),
   };
   return messages[issue];
}
