// === Declaração de variáveis globais ===
let base, eixo, tubo;
let inconsolata;
let data = {};
let date, hour, ah, dec;
let ahSlider, decSlider;
let useSlider = false;
let verificarBtn;
let acertou = false;

// Campos do estudante
let nomeInput, turmaInput, escolaInput, resumoBtn, submitBtn;
let infoExtraDiv, infoFinalDiv;

// Quiz
let quizIndex = 0;
let quizLiberado = Array(13).fill(false);
quizLiberado[0] = true; // libera a primeira questão
let quizDiv, quizFeedbackDiv;

// Coordenadas de Sirius (época J2000)
// RA: 06h 45m 08.9s | DEC: -16° 42′ 58″
const siriusRA = [6, 45, 8.9];
const siriusDEC = [-16, 42, 58];

// Função para calcular AH (ângulo horário) a partir de RA, data e hora local
function calcAH(ra, dateObj) {
  const longitude = -45.45;
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const now = dateObj.getTime();
  const days = (now - J2000) / (1000 * 60 * 60 * 24);

  // GMST em horas
  let GMST = 18.697374558 + 24.06570982441908 * days;
  GMST = (GMST % 24 + 24) % 24;

  // LST em horas
  let LST = GMST + longitude / 15.0;
  LST = (LST % 24 + 24) % 24;

  // RA em horas decimais
  let raDec = ra[0] + ra[1] / 60 + ra[2] / 3600;

  // AH em horas
  let AH = LST - raDec;
  if (AH < -12) AH += 24;
  if (AH > 12) AH -= 24;
  return AH;
}

// === Função para atualização periódica do arquivo JSON ===
async function getJSONData() {
  data = await loadJSON('assets/config.json');
}

// === Pré-carregamento dos modelos 3D, fonte e JSON ===
function preload() {
  base = loadModel('assets/base.obj', false);
  eixo = loadModel('assets/eixo.obj', false);
  tubo = loadModel('assets/tubo.obj', false);
  inconsolata = loadFont('assets/inconsolata.otf');
  data = loadJSON('assets/config.json');
  setInterval(getJSONData, 1000);
}

// === Configuração da tela e da fonte ===
function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  textFont(inconsolata);
  textSize(14);
  textAlign(CENTER, TOP);

  // Sliders para ajuste sutil dos eixos (acima do telescópio)
  // AH agora de -12h a +12h
  ahSlider = createSlider(-12, 12, 0, 0.01).style('width', '180px');
  decSlider = createSlider(-90, 90, 0, 0.1).style('width', '180px');
  ahSlider.input(() => { useSlider = true; acertou = false; });
  decSlider.input(() => { useSlider = true; acertou = false; });

  // Botão para verificar se está ajustado para Sirius
  verificarBtn = createButton('Verificar posição Sirius');
  verificarBtn.style('font-size', '14px');
  verificarBtn.style('background', '#222');
  verificarBtn.style('color', '#eee');
  verificarBtn.style('border', '1px solid #444');
  verificarBtn.mousePressed(() => {
    verificarSirius();
    mostrarExplicacaoSirius();
  });

  // Campos do estudante (inicialmente ocultos)
  nomeInput = createInput('').attribute('placeholder', 'Nome completo').style('width', '250px').style('font-size', '15px').hide();
  turmaInput = createInput('').attribute('placeholder', 'Turma').style('width', '120px').style('font-size', '15px').hide();
  escolaInput = createInput('').attribute('placeholder', 'Nome da escola').style('width', '250px').style('font-size', '15px').hide();
  resumoBtn = createButton('Gerar resumo em DOC').style('font-size', '15px').hide().mousePressed(gerarResumo);
  submitBtn = createButton('Submeter resumo no formulário').style('font-size', '15px').hide().mousePressed(() => {
    window.open('https://forms.gle/2HnU9xh4Ad9dvs2R6', '_blank');
  });

  infoExtraDiv = createDiv('').style('color', '#eee').style('font-size', '15px').style('margin-top', '18px').hide();
  infoFinalDiv = createDiv('').style('color', '#eee').style('font-size', '15px').style('margin-top', '18px').hide();

  positionControls();
  setupQuiz();
  windowResized();
}

// UX: posiciona sliders acima do telescópio, botão e info abaixo
function positionControls() {
  let x = 30;
  let yBase = windowHeight / 2 - 260;
  const sliderSpacing = 70;
  const labelOffset = 32;

  // AH
  if (!window.ahLabel) {
    window.ahLabel = createDiv('Ajuste AH (h)')
      .style('color', '#ccc')
      .style('font-size', '15px')
      .style('background', 'transparent');
  }
  window.ahLabel.position(x, yBase - labelOffset);
  if (ahSlider) ahSlider.position(x, yBase);
  ahSlider.elt.disabled = !interacaoLiberada().sliders;

  // DEC
  if (!window.decLabel) {
    window.decLabel = createDiv('Ajuste DEC (°)')
      .style('color', '#ccc')
      .style('font-size', '15px')
      .style('background', 'transparent');
  }
  window.decLabel.position(x, yBase + sliderSpacing - labelOffset);
  if (decSlider) decSlider.position(x, yBase + sliderSpacing);
  decSlider.elt.disabled = !interacaoLiberada().sliders;

  // Botão
  verificarBtn.position(x, windowHeight / 2 + 60);
  verificarBtn.elt.disabled = !interacaoLiberada().botao;

  // Bloco de informações
  if (window.infoDiv) {
    let infoY = windowHeight / 2 + 120;
    window.infoDiv.position(x, infoY);
  }

  // Campos do estudante
  let camposY = windowHeight / 2 + 260;
  if (quizLiberado[7]) {
    nomeInput.show().position(x, camposY);
  } else {
    nomeInput.hide();
  }
  if (quizLiberado[8]) {
    turmaInput.show().position(x, camposY + 40);
    escolaInput.show().position(x, camposY + 80);
  } else {
    turmaInput.hide();
    escolaInput.hide();
  }
  if (quizLiberado[10]) {
    resumoBtn.show().position(x, camposY + 130);
  } else {
    resumoBtn.hide();
  }
  if (quizLiberado[11]) {
    submitBtn.show().position(x, camposY + 180);
  } else {
    submitBtn.hide();
  }
  if (quizLiberado[8]) {
    infoExtraDiv.show().position(x, camposY + 120);
  } else {
    infoExtraDiv.hide();
  }
  if (quizLiberado[11]) {
    infoFinalDiv.show().position(x, camposY + 230);
  } else {
    infoFinalDiv.hide();
  }
}

// Redimensionamento responsivo
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  positionControls();
  if (quizDiv) {
    quizDiv.style('top', '40px').style('right', '40px');
  }
}

// === Função principal de desenho ===
function draw() {
  background(0);

  if (data['hour']) {
    hour = data['hour'];
    ah = data['ah'];
    dec = data['dec'];
    date = data['date'];
  }

  // Usa sliders se o usuário interagir
  let ahValue = useSlider ? ahSlider.value() : ah_decimal();
  let decValue = useSlider ? decSlider.value() : dec_decimal();

  // --- Sirius: verifica automaticamente se está no campo ---
  const ahSirius = 6.75; // 6h 45m
  const decSirius = -16.72; // -16° 43'
  // Tolerância: 0.25h (~15min) e 0.5°
  acertou = (abs(ahValue - ahSirius) < 0.25 && abs(decValue - decSirius) < 0.5);

  const latitude = -22.5344;
  const AzElev = getAzimuthElevation(ahValue, decValue, latitude);

  // Área 3D centralizada e ampliada
  push();
  // Centraliza horizontalmente e ajusta verticalmente
  translate(0, 0, 0); // Centro da tela
  scale(0.045); // Aumenta o tamanho dos objetos (ajuste conforme necessário)

  // === BASE ===
  ambientMaterial(200); // cinza claro
  stroke(180);
  rotateY(-150 * PI / 180);
  rotateX((latitude - 180) * PI / 180);
  model(base);

  // === EIXO ===
  ambientMaterial(220); // cinza mais claro
  stroke(180);
  rotateZ(-ahValue * 15 * PI / 180);
  translate(0, 0, 2397);
  model(eixo);

  // === TUBO ===
  ambientMaterial(255); // quase branco
  stroke(200);
  translate(-508, 0, 0);
  rotateX(latitude * PI / 180);
  rotateX(-decValue * PI / 180);
  model(tubo);
  pop();

  // Parâmetros abaixo do telescópio, centralizados à esquerda
  let info = `
    <div style="color:${acertou ? '#00ff64' : '#e0e0e0'};font-family:monospace;font-size:16px;background:transparent;">
      <b>PE160</b><br>
      Date: ${date || ''}<br>
      Hour: ${hour || ''}<br>
      AH: ${(useSlider ? ahValue.toFixed(2) : ah)}<br>
      DEC: ${(useSlider ? decValue.toFixed(2) : dec)}<br>
      AZ: ${AzElev.azimuth}<br>
      ALT: ${AzElev.elevation}<br>
      ${acertou ? '<span style="color:#00ff64;font-weight:bold;">Ajuste correto! Sirius está no campo!</span>' : ''}
    </div>
  `;
  if (!window.infoDiv) {
    window.infoDiv = createDiv('').style('position', 'absolute');
  }
  window.infoDiv.html(info);

  // Textos informativos extras
  if (quizLiberado[8]) {
    infoExtraDiv.html(`<b>O Maior Telescópio em Solo Brasileiro – Perkin-Elmer 1,60 m</b><br>
    O maior telescópio óptico em operação no Brasil é o Telescópio Perkin-Elmer de 1,60 metros, instalado no Observatório do Pico dos Dias (OPD), em Brazópolis, Minas Gerais. Esse instrumento é operado pelo Laboratório Nacional de Astrofísica (LNA) e entrou em funcionamento em 1981.`);
  }
  if (quizLiberado[11]) {
    infoFinalDiv.html(`
      <b>Sobre o Perkin-Elmer 1,60 m</b><br>
      Com um espelho primário de 1,60 m de diâmetro, o telescópio é do tipo refletor Ritchey-Chrétien e possui montagem equatorial alemã, ideal para acompanhar o movimento aparente das estrelas. Sua precisão e versatilidade o tornaram o principal instrumento da astrofísica observacional brasileira por décadas.<br><br>
      Ele é utilizado em diversas áreas da astronomia, como:<br>
      - Estudo de estrelas e galáxias,<br>
      - Pesquisa de asteroides e exoplanetas,<br>
      - Polarimetria e espectroscopia astronômica.<br><br>
      Desde 2024, foi equipado com o SPARC4, um avançado sistema de imageamento e polarimetria simultânea em quatro bandas do espectro, com câmeras EMCCD. Essa atualização permitiu novos tipos de observações de objetos variáveis, como estrelas pulsantes e sistemas binários.<br><br>
      Com sua localização a 1.864 metros de altitude, em uma das regiões mais altas da Serra da Mantiqueira, o telescópio se beneficia de noites limpas e boa transparência atmosférica, sendo essencial também na formação de astrônomos e na divulgação científica.
    `);
  }
}

// === Conversão de ângulo horário (AH) para decimal ===
function ah_decimal() {
  if (!ah) return 0;
  let parts = ah.trim().split(" ");
  let result = float(abs(parts[0])) + float(parts[1]) / 60 + float(parts[2]) / 3600;
  if (parseFloat(parts[0]) < 0) result = -result;
  return result;
}

// === Conversão de declinação (DEC) para decimal ===
function dec_decimal() {
  if (!dec) return 0;
  let parts = dec.trim().split(" ");
  let result = float(abs(parts[0])) + float(parts[1]) / 60 + float(parts[2]) / 3600;
  if (parseFloat(parts[0]) < 0) result = -result;
  return result;
}

// === Conversão de coordenadas para Azimute e Elevação ===
function getAzimuthElevation(ha, dec, latitude) {
  const DEG2RAD = PI / 180;
  const RAD2DEG = 180 / PI;
  const H = ha * 15;

  const sinElevation = sin(dec * DEG2RAD) * sin(latitude * DEG2RAD) +
                       cos(dec * DEG2RAD) * cos(latitude * DEG2RAD) * cos(H * DEG2RAD);
  let elevation = asin(sinElevation) * RAD2DEG;
  elevation = round(elevation * 100) / 100;

  const cotAz = sin(latitude * DEG2RAD) / tan(H * DEG2RAD) -
                cos(latitude * DEG2RAD) * tan(dec * DEG2RAD) / sin(H * DEG2RAD);
  let azimuth = atan2(1, cotAz) * RAD2DEG;

  if (H < 0) {
    azimuth = round(azimuth * 100) / 100;
  } else {
    azimuth = round((azimuth + 180) * 100) / 100;
  }

  return { azimuth, elevation };
}

// === Botão: Verificar se está ajustado para Sirius ===
function verificarSirius() {
  // Valores fixos para Sirius (aproximados)
  const ahSirius = 6.75; // 6h 45m
  const decSirius = -16.72; // -16° 43'

  let ahAtual = ahSlider.value();
  let decAtual = decSlider.value();

  // Tolerância mais flexível: 0.25h para AH (~15min) e 0.5° para DEC
  if (abs(ahAtual - ahSirius) < 0.25 && abs(decAtual - decSirius) < 0.5) {
    acertou = true;
  } else {
    acertou = false;
  }
}

// Explicação sutil ao clicar no botão Sirius
function mostrarExplicacaoSirius() {
  // Cria ou atualiza uma div de explicação próxima ao botão
  if (!window.siriusHintDiv) {
    window.siriusHintDiv = createDiv('').style('position', 'absolute')
      .style('left', (verificarBtn.position().x + 0) + 'px')
      .style('top', (verificarBtn.position().y + 38) + 'px')
      .style('background', 'rgba(30,30,40,0.97)')
      .style('color', '#b0e0ff')
      .style('padding', '10px 16px')
      .style('border-radius', '8px')
      .style('font-size', '15px')
      .style('font-family', 'monospace')
      .style('z-index', '2000')
      .style('box-shadow', '0 2px 12px #0008');
  }
  window.siriusHintDiv.html(
    acertou
      ? '✅ Parabéns! Os controles estão ajustados para Sirius.<br>Você pode prosseguir.'
      : 'Ajuste os controles de AH (aprox. 6,75h) e DEC (aprox. -16,72°) para apontar o telescópio para Sirius.<br>Depois, clique novamente para verificar.'
  );
  window.siriusHintDiv.show();

  // Some automaticamente após 6 segundos se não acertou, ou 3 segundos se acertou
  clearTimeout(window.siriusHintTimeout);
  window.siriusHintTimeout = setTimeout(() => {
    window.siriusHintDiv.hide();
  }, acertou ? 3000 : 6000);
}

// === Quiz interativo no canto direito ===
const quizData = [
  // 1
  {
    pergunta: `<b>Introdução à óptica geométrica</b><br>
    Chamamos de fontes de luz os corpos capazes de emitir ou refletir a luz. Corpos que emitem luz própria, como o Sol, são chamados de fontes de luz primárias. Já os corpos que não produzem luz própria, isto é, apenas refletem a luz de outras fontes, são chamados de fontes de luz secundárias.<br><br>
    <b>Questão 1:</b> O Sol é um exemplo de:<br>`,
    opcoes: [
      "A) Fonte de luz secundária",
      "B) Fonte de luz primária",
      "C) Fonte de luz translúcida",
      "D) Fonte de luz opaca"
    ],
    correta: 1,
    justificativa: "O Sol emite luz própria, sendo uma fonte de luz primária."
  },
  // 2
  {
    pergunta: `As fontes de luz também são classificadas de acordo com suas dimensões. Elas são chamadas pontuais ou puntiformes quando a fonte tem tamanho desprezível em relação ao ambiente de propagação. Nas fontes pontuais, os raios têm uma única origem.<br><br>
    <b>Questão 2:</b> Uma estrela distante é considerada uma fonte de luz:<br>`,
    opcoes: [
      "A) Extensa",
      "B) Translúcida",
      "C) Pontual",
      "D) Opaca"
    ],
    correta: 2,
    justificativa: "Estrelas distantes são fontes de luz pontuais."
  },
  // 3
  {
    pergunta: `Selecione a alternativa que apresenta corretamente uma fonte de luz primária:<br>`,
    opcoes: [
      "A) O reflexo de uma pessoa em um espelho.",
      "B) A chama de um fogão.",
      "C) A Lua cheia.",
      "D) Uma parede branca iluminada."
    ],
    correta: 1,
    justificativa: "A chama do fogão emite luz própria, sendo fonte primária."
  },
  // 4
  {
    pergunta: `A representação retilínea da luz é denominada raio de luz. O conjunto de raios de luz é chamado feixe de luz e pode ser caracterizado em paralelo, divergente e convergente.<br>
    <img src="assets/feixes_luz.png" width="320" alt="Tipos de feixe de luz"><br>
    <b>Questão 4:</b> O feixe de luz que representa os raios se afastando de um ponto é chamado de:<br>`,
    opcoes: [
      "A) Feixe paralelo",
      "B) Feixe divergente",
      "C) Feixe convergente",
      "D) Feixe opaca"
    ],
    correta: 1,
    justificativa: "No feixe divergente, os raios se afastam de um ponto."
  },
  // 5
  {
    pergunta: `Chamamos de meios ópticos os meios materiais em que pode haver a propagação da luz.<br>
    <img src="assets/meios_opticos.png" width="320" alt="Meios ópticos"><br>
    <b>Questão 5:</b> O ar atmosférico é um exemplo de meio:<br>`,
    opcoes: [
      "A) Translúcido",
      "B) Opaco",
      "C) Transparente",
      "D) Refletor"
    ],
    correta: 2,
    justificativa: "O ar atmosférico é um meio transparente para a luz visível."
  },
  // 6
  {
    pergunta: `Analise as afirmações abaixo e escolha a alternativa que apresenta apenas fontes luminosas primárias:<br>
    A) lanterna acesa, espelho plano, vela apagada.<br>
    B) lâmpada acesa, fio aquecido ao rubro, vaga-lume aceso.<br>
    C) olho-de-gato, Lua, palito de fósforo aceso.<br>
    D) planeta Marte, fio aquecido ao rubro, parede de cor clara.<br>
    E) vídeo de uma TV em funcionamento, Sol, lâmpada apagada.<br>`,
    opcoes: [
      "A",
      "B",
      "C",
      "D",
      "E"
    ],
    correta: 1,
    justificativa: "Lâmpada acesa, fio aquecido ao rubro e vaga-lume aceso são fontes primárias."
  },
  // 7
  {
    pergunta: `Considere as características de fontes de luz pontuais e extensas.<br>
    Qual das alternativas abaixo descreve corretamente um exemplo de fonte de luz extensa?<br>
    A) Uma vela acesa observada à grande distância.<br>
    B) Um farol de carro ligado, visto de longe, à noite.<br>
    C) A tela acesa de uma televisão vista do sofá.<br>
    D) Uma estrela distante visível no céu noturno.<br>`,
    opcoes: [
      "A",
      "B",
      "C",
      "D"
    ],
    correta: 2,
    justificativa: "A tela da TV é uma fonte extensa, pois tem tamanho apreciável em relação ao ambiente."
  },
  // 8
  {
    pergunta: `A respeito dos meios de propagação da luz, analise as seguintes afirmativas:<br>
    I. A água pura é um meio transparente.<br>
    II. O papel vegetal é um meio translúcido.<br>
    III. O ferro polido é um meio opaco.<br>
    Assinale a alternativa correta:<br>`,
    opcoes: [
      "A) Apenas a afirmativa I é verdadeira.",
      "B) Nenhuma das afirmativas é verdadeira.",
      "C) Todas as afirmativas são verdadeiras.",
      "D) Apenas as afirmativas I e II são verdadeiras.",
      "E) Apenas as afirmativas II e III são verdadeiras."
    ],
    correta: 2,
    justificativa: "Todas as afirmativas estão corretas."
  },
  // 9
  {
    pergunta: `Analise as afirmações a seguir e selecione a opção correta:<br>
    1. O eclipse solar ocorre quando a Lua bloqueia a luz do Sol, projetando uma sombra na superfície da Terra.<br>
    2. O eclipse lunar acontece quando a Terra bloqueia a luz do Sol que deveria iluminar a Lua, formando uma região de sombra.<br>
    3. A formação das sombras durante os eclipses depende do fato de que a luz se propaga em linha reta.<br>`,
    opcoes: [
      "A) Apenas a afirmativa 2 está correta.",
      "B) Apenas as afirmativas 2 e 3 estão corretas.",
      "C) Apenas as afirmativas 1 e 3 estão corretas.",
      "D) Todas as afirmativas estão corretas."
    ],
    correta: 3,
    justificativa: "Todas as afirmativas estão corretas."
  },
  // 10
  {
    pergunta: `O fenômeno da reflexão da luz consiste na mudança da direção da luz ao incidir em uma superfície refletora, retornando ao meio de origem. A característica fundamental da reflexão da luz é tornar iluminado qualquer corpo. Essa reflexão pode ocorrer de uma série de maneiras distintas, dependendo do material onde a luz incide. Essas reflexões distintas são chamadas de fenômenos ópticos.<br><br>
    <b>Questão 10:</b> O espelho do telescópio Perkin-Elmer é um exemplo de reflexão:<br>`,
    opcoes: [
      "A) Difusa",
      "B) Regular",
      "C) Opaca",
      "D) Translúcida"
    ],
    correta: 1,
    justificativa: "O espelho do telescópio realiza reflexão regular, pois é polido e liso."
  },
  // 11 (ajustada)
  {
    pergunta: `
      Quando a superfície refletora é lisa ou polida, ocorre a reflexão regular da luz. Observe, na representação gráfica, que os raios incidentes e os raios refletidos permanecem paralelos.<br>
      Quando a superfície refletora é rugosa ou irregular, ocorre a reflexão difusa da luz. Observe, na representação gráfica, que os raios incidem paralelamente e são refletidos de forma irregular.<br>
      <img src="assets/reflexao_regular_difusa.png" width="320" alt="Reflexão regular e difusa"><br>
      <b>Questão 11:</b> O que ocorre com a luz ao incidir em uma superfície rugosa?<br>
    `,
    opcoes: [
      "A) É refletida de forma regular.",
      "B) É absorvida totalmente.",
      "C) É refletida de forma difusa.",
      "D) É transmitida sem alteração."
    ],
    correta: 2,
    justificativa: "Superfícies rugosas promovem reflexão difusa."
  },
  // 12
  {
    pergunta: `Um estudante está analisando diferentes sistemas ópticos e suas aplicações. Ele observa as seguintes situações:<br>
    1. Um telescópio que utiliza uma lente objetiva para formar uma imagem real e uma lente ocular para ampliá-la.<br>
    2. Um espelho parabólico usado em um telescópio para captar luz de objetos distantes.<br>
    3. Uma lupa utilizada para observar detalhes de pequenos objetos.<br>
    4. Um espelho plano posicionado para redirecionar a luz em um experimento.<br>
    5. Um microscópio composto que utiliza lentes para ampliar imagens.<br><br>
    Com base nas características desses sistemas ópticos, qual das alternativas classifica corretamente cada sistema quanto ao seu tipo principal de operação?<br>`,
    opcoes: [
      "A) Refratores: 1, 3, 5; Refletores: 2, 4",
      "B) Refratores: 1, 3, 5; Refletores: 2; Nenhum: 4",
      "C) Refratores: 1, 3, 4; Refletores: 2, 5",
      "D) Refratores: 1, 5; Refletores: 2, 3, 4",
      "E) Refratores: 1, 3; Refletores: 2, 4, 5"
    ],
    correta: 0,
    justificativa: "1, 3, 5 são refratores (lentes); 2, 4 são refletores (espelhos)."
  }
];

function setupQuiz() {
  // Cria o quiz no canto direito
  if (!quizDiv) {
    quizDiv = createDiv('').style('position', 'absolute')
      .style('top', '40px')
      .style('right', '40px')
      .style('width', '400px')
      .style('background', 'rgba(20,20,20,0.98)')
      .style('border-radius', '12px')
      .style('padding', '22px 18px 18px 18px')
      .style('color', '#eee')
      .style('font-family', 'monospace')
      .style('font-size', '15px')
      .style('box-shadow', '0 2px 16px #0008')
      .style('z-index', '1000');
  }
  if (!quizFeedbackDiv) {
    quizFeedbackDiv = createDiv('').parent(quizDiv)
      .style('margin-top', '12px')
      .style('font-size', '14px');
  }
  renderQuiz();
}

// Interatividade mais agradável para o quiz
function renderQuiz() {
  let q = quizData[quizIndex];
  let html = `
    <b>Quiz de Óptica (${quizIndex + 1}/${quizData.length})</b><br><br>
    <div style="margin-bottom:12px;">${q.pergunta}</div>
    <div id="quiz-options"></div>
    <div id="quiz-progress" style="margin-top:18px;font-size:13px;color:#aaa;">
      ${quizIndex + 1} de ${quizData.length} questões
    </div>
  `;
  quizDiv.html(html);
  quizFeedbackDiv.html('');

  // Renderiza opções com animação
  let optionsDiv = select('#quiz-options', quizDiv);
  q.opcoes.forEach((op, i) => {
    let btn = createButton(op)
      .parent(optionsDiv)
      .style('width', '100%')
      .style('margin', '6px 0')
      .style('background', '#222')
      .style('color', '#eee')
      .style('border', '1px solid #444')
      .style('padding', '8px 0')
      .style('border-radius', '6px')
      .style('font-size', '15px')
      .style('transition', 'background 0.2s, color 0.2s')
      .mouseOver(function() { this.style('background', '#333'); })
      .mouseOut(function() { this.style('background', '#222'); })
      .mousePressed(() => responderQuizAnimado(i, btn));
  });
}

// Nova função para feedback animado e bloqueio de múltiplos cliques
function responderQuizAnimado(resposta, btn) {
  let q = quizData[quizIndex];
  // Desabilita todos os botões
  selectAll('button', quizDiv).forEach(b => b.attribute('disabled', true));
  if (resposta === q.correta) {
    btn.style('background', '#00ff64').style('color', '#111');
    quizFeedbackDiv.html(`<span style="color:#00ff64;font-weight:bold;">Correto!</span><br><span style="color:#aaa;">${q.justificativa}</span>`);
    quizLiberado[quizIndex + 1] = true;
    setTimeout(() => {
      if (quizIndex < quizData.length - 1) {
        quizIndex++;
        renderQuiz();
      } else {
        quizDiv.html('<b>Quiz finalizado! Todas as interações liberadas.</b>');
        quizFeedbackDiv.html('');
        quizLiberado = quizLiberado.map(() => true);
        positionControls();
      }
      positionControls();
    }, 1800);
  } else {
    btn.style('background', '#ff5050').style('color', '#fff');
    quizFeedbackDiv.html(`<span style="color:#ff5050;font-weight:bold;">Incorreto!</span>`);
    setTimeout(() => {
      btn.style('background', '#222').style('color', '#eee');
      // Reabilita botões para tentar novamente
      selectAll('button', quizDiv).forEach(b => b.attribute('disabled', false));
      quizFeedbackDiv.html('');
    }, 1200);
  }
}

// Substitua window.responderQuiz por uma função vazia para evitar conflito
window.responderQuiz = function() {};

// Libera interações do telescópio conforme progresso no quiz
function interacaoLiberada() {
  // sliders: após questão 2, botão Sirius após questão 3, coordenadas Sirius após 3, campos após 7, textos após 8, resumo após 10, submit após 11
  return {
    sliders: quizLiberado[2],
    botao: quizLiberado[3]
  };
}

// Gera resumo em DOC (simples, pode ser melhorado com bibliotecas)
function gerarResumo() {
  let nome = nomeInput.value();
  let turma = turmaInput.value();
  let escola = escolaInput.value();
  let texto = `Nome: ${nome}\nTurma: ${turma}\nEscola: ${escola}\n\nResumo do Quiz e Telescópio:\n\n`;
  for (let i = 0; i < quizData.length; i++) {
    texto += `Q${i + 1}: ${quizData[i].pergunta.replace(/<[^>]*>?/gm, '')}\n`;
    texto += `Resposta correta: ${quizData[i].opcoes[quizData[i].correta]}\n\n`;
  }
  let blob = new Blob([texto], { type: "application/msword" });
  let url = URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.href = url;
  a.download = "resumo_telescopio.doc";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
