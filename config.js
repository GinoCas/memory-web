/**
 * ==============================================================================
 * ARCHIVO DE CONFIGURACIÓN DEL EXPERIMENTO
 * ==============================================================================
 * Puedes modificar libremente los valores de este archivo según tus necesidades.
 * Asegúrate de guardar los cambios antes de recargar la aplicación en el navegador.
 */

window.EXPERIMENT_CONFIG = {
  // Lista de palabras objetivo utilizadas en la prueba
  words: [
    "reloj",
    "árbol",
    "guitarra",
    "libro",
    "pelota",
    "botella",
    "pajaro",
    "computadora",
    "bicicleta",
  ],

  // Ruta relativa o absoluta de la imagen para el Grupo 1 (Memoria Espacial).
  // Cuando tengas tu imagen, colócala en esta ruta o actualiza el nombre aquí.
  imagePath: "assets/image.png",

  // URL del Web App de Google Apps Script para guardar datos en Google Sheets.
  // Déjalo vacío ("") si solo quieres guardar en el almacenamiento local del navegador.
  googleSheetsWebAppUrl: "https://script.google.com/macros/s/AKfycbx4TI0p5zXwwh_y2eCOIt768wpfAW5akdEDtKTmc5b8jTij9-JmOA1CeQpqsyx0krZ4/exec",

  // Tiempo límite para la fase de estudio / memorización del estímulo (en segundos)
  studyDurationSeconds: 30,

  // Tiempo límite para la fase distractora de ejercicios matemáticos (en segundos)
  mathTaskDurationSeconds: 60,

  // Lista de 12 ejercicios matemáticos simples (sumas, restas, multiplicaciones, divisiones)
  // Serán los mismos para todos los participantes pero se presentarán en orden aleatorio
  mathProblems: [
    { question: "7 + 10", answer: 17 },
    { question: "24 - 23", answer: 1 },
    { question: "6 × 4", answer: 24 },
    { question: "20 ÷ 2", answer: 10 },
    { question: "7 + 7", answer: 14 },
    { question: "(3 * 3) + 1", answer: 10 },
    { question: "1 × 5", answer: 5 },
    { question: "3 ÷ 3", answer: 1 },
    { question: "10 * 10", answer: 100 },
    { question: "20 - 4", answer: 16 },
    { question: "3 × 3", answer: 9 },
    { question: "81 ÷ 9", answer: 9 }
  ],

  // Tiempo límite para la fase de recuerdo / escritura de palabras (en segundos).
  // Coloca 0 si prefieres que el participante no tenga límite de tiempo.
  recallDurationSeconds: 90,

  // Permite que el participante pase a la siguiente fase antes de que el cronómetro llegue a 0
  allowEarlyFinish: true
};
