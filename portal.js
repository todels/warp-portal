// Warp Portal runtime: a WebGL2 light-streak tunnel.
// createPortal is self-contained on purpose (no outer references): "Copy code" embeds its source.
//
// Model: every streak is a radial wedge of light (constant angular width, so it is sharp near the
// vanishing point and soft toward the sides). Streaks are grouped into lobes; each lobe slides
// outward in log-radius as one piece, speeding up as it goes (q = r^-BETA falls linearly), and
// comes back near the center at almost the same angle, like light strips on a tunnel wall.
// The widest soft wedges around the center are ambient light and stay put.
// The opening frame (seed 1, t = 0) is fitted to the reference still.
export function createPortal(canvas, params, options) {
  'use strict';
  var REF = /*REF*/{"colors":["#1a55ff","#6f3fff","#ff38cd","#eda3ff","#ff81a5"],"background":"#00003b","glow":"#7737bb","glowK":1.0,"glowS":0.0362,"kap":0.00014,"b0":0.00235,"beta":0.8,"rSpawn":0.025,"life":8.0,"centerX":-0.00559,"centerY":0.00147,"s":[-3.0549,0.02507,-1.726,0.087,-1.19,0.794,0.0,0.0,0.0,0.8859,0.2695,0,-3.2725,0.2,-4.092,0.464,-1.34,0.339,0.1852,0.0,0.0981,0.0009,0.0,-1,-3.0032,0.05127,-2.938,0.08,-0.443,0.44,0.2493,0.0,0.0262,0.0034,0.0,0,-3.0225,0.02918,-2.912,0.08,-2.262,0.375,0.0,0.0,0.0018,0.0008,0.3664,0,-3.0453,0.02951,-2.308,1.026,1.386,0.662,0.6857,0.0,0.0,0.0,0.0,0,-3.0693,0.02446,-0.665,0.08,0.074,0.703,0.966,0.0,0.0,0.1157,0.0,0,-3.0087,0.03051,-2.616,0.131,-1.793,0.182,0.5309,0.0,0.0,0.023,0.0,0,-2.9958,0.06987,-2.974,0.166,-2.449,0.327,0.0,0.0,0.2527,0.0012,0.009,-1,-2.797,0.11985,-2.677,0.636,-1.018,1.582,0.064,0.3516,0.0761,0.0,0.0,-1,-2.6369,0.06421,-3.74,1.4,0.14,0.902,0.205,0.2309,0.0011,0.0,0.0,1,-2.6404,0.04345,-2.474,0.296,-1.265,1.018,0.3757,0.0,0.0,0.2246,0.0,1,-2.6069,0.07206,-2.957,0.165,-2.302,0.735,0.0,0.0,0.0038,0.0014,0.7834,-1,-2.5728,0.03269,-1.151,0.347,0.05,0.763,0.0934,0.0,0.2751,0.0005,0.0,2,-3.1674,0.2,-3.604,0.428,-0.606,0.437,0.2041,0.202,0.001,0.0,0.0,-1,-2.5673,0.19325,-3.849,0.803,-2.306,0.273,0.2959,0.0,0.1805,0.0048,0.0,-1,-2.4996,0.04493,-2.722,0.54,0.216,1.218,0.1006,0.0,0.0,0.4412,0.0,4,-2.4552,0.0294,-2.843,0.08,-1.819,1.074,0.3357,0.0,0.7058,0.5948,0.0,4,-2.477,0.05107,-1.262,0.159,-0.346,0.834,0.0,0.0,0.0014,0.0009,0.3418,4,-2.3101,0.04699,-2.49,0.262,-1.832,0.449,0.0,0.0,0.6894,1.0086,0.0027,3,-2.5198,0.2,-2.318,0.293,-0.96,0.95,0.5844,0.0,0.0,0.0002,0.0,-1,-2.401,0.09384,-1.87,0.725,-0.314,1.154,0.0006,0.0,0.0,1.2107,0.0,4,-2.1806,0.12063,-4.89,0.531,0.315,0.162,0.2024,0.0,0.0592,0.0007,0.0,5,-2.3499,0.08212,-2.958,0.436,-1.311,0.17,0.0,0.0,0.2791,0.0015,0.0411,-1,-2.1462,0.13446,-2.328,0.189,-1.326,0.653,0.0004,0.0,0.7407,0.0109,0.0,-1,-2.1996,0.14089,-1.794,0.334,-0.388,0.678,0.0997,0.0,0.0,0.3634,0.0,-1,-1.9573,0.2,-2.815,0.687,-1.83,0.493,0.0077,0.0,0.8517,0.0011,0.0,-1,-2.0757,0.07437,-2.572,0.117,-0.406,1.11,0.0012,0.0,0.0,0.6985,0.0,-1,-1.8317,0.05929,-2.355,0.237,-1.316,0.494,0.2694,0.0,0.0,0.2725,0.0,7,-1.976,0.04942,-2.689,0.111,-0.791,0.834,0.1602,0.0,0.0,0.5232,0.0,6,-1.8848,0.06806,-3.021,0.132,0.638,1.165,0.2411,0.0,0.1361,0.1355,0.0,7,-1.3229,0.2,-2.808,0.575,-2.008,1.496,0.0,0.0,0.2654,0.0011,0.0009,-1,-1.9572,0.11013,-2.712,0.145,-2.319,0.163,0.0,0.0,0.0033,0.0014,0.7876,-1,-1.8005,0.07431,-3.689,0.204,-0.889,0.401,0.4542,0.0,0.1624,0.0192,0.0,-1,-1.651,0.03549,-1.915,0.226,-0.98,0.33,0.4935,0.0,0.0004,0.0006,0.0,9,-1.6248,0.02213,-2.32,0.145,-1.568,0.908,0.3774,0.0,0.0462,0.3799,0.0,9,-1.7334,0.06943,-0.826,0.27,1.386,0.554,0.0,0.0,0.2829,0.0018,0.3639,8,-1.5471,0.04789,-3.99,0.199,-1.919,0.711,0.4605,0.0,0.0,0.1348,0.0,9,-1.5618,0.02687,-0.803,0.142,1.386,0.499,0.0,0.0,0.0023,0.0009,0.5472,9,-1.5605,0.13561,-4.006,0.339,1.386,0.593,0.0041,0.1675,0.0885,0.0,0.0,9,-1.51,0.02953,-1.378,0.147,-0.727,0.555,0.0,0.0,0.6392,0.0034,0.5196,9,-1.5383,0.2,-4.745,0.921,-3.712,0.367,0.1002,0.0,0.1819,0.0019,0.0,-1,-1.2516,0.17481,-3.694,1.4,-1.232,0.66,0.1789,0.1393,0.0052,0.0,0.0,-1,-1.3563,0.03498,-2.132,0.166,-1.148,0.718,0.6312,0.0,0.0,0.0002,0.0,10,-1.3912,0.02129,-1.889,0.111,-1.231,0.412,0.0,0.0,0.0031,0.0013,0.6993,12,-1.3485,0.03138,-2.424,0.134,-1.854,0.521,0.0,0.0,0.4482,0.0025,0.3296,10,-1.115,0.01475,-0.637,0.699,-2.552,1.6,0.0,0.0001,0.0001,0.0005,0.0,11,-1.401,0.02515,-1.393,0.379,-0.601,0.256,0.5149,0.0,0.0,0.0572,0.0,12,-1.0978,0.00918,-0.499,1.16,-2.883,1.442,0.0003,0.0,0.0001,0.0005,0.0,13,-1.1722,0.12444,-1.239,0.538,-0.388,0.361,0.0,0.0,0.0,0.0111,0.0082,-1,-0.9662,0.04226,-0.868,0.174,-0.495,0.225,0.0267,0.0,0.0001,0.0099,0.0,14,-0.9476,0.07717,-2.898,0.276,-0.943,0.334,0.0441,0.1297,0.0167,0.0,0.0,-1,-0.7298,0.03818,-2.741,0.088,-2.132,1.16,0.0,0.0,0.0033,0.0014,0.8056,16,-0.8929,0.17258,-4.432,0.308,-1.519,0.352,0.1494,0.0,0.1005,0.0003,0.0,-1,-0.8449,0.0288,-2.038,0.166,-1.558,0.73,0.0,0.0,0.7044,0.031,0.6832,15,-0.8522,0.03641,-1.561,0.317,-0.432,0.664,0.9138,0.0,0.0,0.0001,0.0,15,-0.7236,0.0835,-3.67,0.305,-2.259,0.165,0.3393,0.0,0.2305,0.0311,0.0,-1,-0.7393,0.05333,-2.29,0.161,-0.942,0.981,1.0758,0.0,0.0,0.0247,0.0,16,-0.576,0.07229,-2.584,0.259,-1.216,1.549,1.76,0.0,0.0,0.0003,0.0,-1,-0.6397,0.01981,-1.821,0.08,-0.545,0.309,0.8104,0.0,0.0,0.0018,0.0,18,-0.4684,0.10387,-3.167,0.31,-2.666,0.337,0.0,0.0,0.6066,0.0026,0.0732,-1,-0.6526,0.02671,-0.425,0.17,1.386,0.484,0.0,0.0,0.3415,0.002,0.3831,17,-0.6359,0.02629,-2.905,0.102,-1.165,0.376,0.0,0.0,0.0022,0.0014,0.5216,18,-0.5465,0.04061,-2.978,0.08,-2.338,1.535,0.0116,0.0,0.0,1.0335,0.0,19,-0.3672,0.05947,-2.985,0.553,-2.057,0.453,1.2872,0.0,0.0,0.0449,0.0,20,-0.4038,0.05716,-1.765,0.253,-0.912,0.765,0.0008,0.0,0.9982,0.0089,0.0,21,-0.4112,0.02862,-1.771,0.084,-0.862,1.6,0.0,0.0,0.0038,0.0014,0.9097,21,-0.4119,0.0455,-1.12,0.317,0.316,0.674,0.7463,0.0,0.0,0.0182,0.0,21,-0.1936,0.2,-3.813,0.432,0.011,0.363,0.0035,0.0,0.1863,0.0,0.0,22,-0.2075,0.06058,-1.002,0.144,-0.569,0.328,0.0,0.0,0.002,0.0007,0.4553,-1,-0.2127,0.02108,-1.024,0.181,-0.312,0.814,0.0,0.0,0.0042,0.0016,1.0603,22,-0.2172,0.04412,-0.822,0.457,0.094,0.08,0.0,0.0,1.0311,0.004,0.0066,22,-0.1116,0.02256,-0.901,0.189,0.094,0.08,0.0,0.0,0.693,0.0031,0.243,22,-0.1402,0.0235,-2.07,0.08,0.032,0.08,0.0654,0.0,0.396,0.2698,0.0,22,-0.1223,0.01208,-0.924,0.132,-0.574,0.221,0.0003,0.0,0.0,0.6367,0.0,22,-0.0797,0.03893,-1.005,0.1,1.386,1.293,0.0,0.0,0.2168,0.001,0.0366,22,0.0106,0.04277,-0.279,0.291,1.386,0.432,0.0,0.0,0.0037,0.0161,0.3658,23,0.108,0.03441,-2.792,0.136,-2.204,0.363,0.0,0.0,0.341,0.1657,0.1239,24,0.082,0.02746,-1.679,0.096,-0.974,0.748,0.0,0.0,0.8555,0.004,0.4174,24,0.0751,0.05323,-1.076,0.189,0.024,0.121,0.3207,0.0,0.0,0.0001,0.0,24,0.0885,0.02343,-2.446,0.251,0.399,0.203,0.7069,0.0,0.0,0.0583,0.0,24,-0.1417,0.12051,-3.487,0.318,-1.054,0.145,0.3084,0.0123,0.0192,0.0,0.0,-1,0.3398,0.01033,-0.472,1.104,-2.159,0.792,0.0005,0.0,0.0001,0.0006,0.0,25,0.3374,0.01458,0.182,0.714,-1.958,1.556,0.0,0.0,0.0002,0.0006,0.0,26,0.465,0.05901,-2.81,0.08,-2.168,0.634,0.0,0.0,0.0028,0.0009,0.5154,27,0.6167,0.18155,-2.864,0.551,-2.26,0.362,0.0042,0.0,0.6273,0.003,0.0,-1,0.4567,0.04042,-3.42,1.4,-1.444,0.661,0.0861,0.0,0.0,0.2378,0.0,27,0.5146,0.0704,-2.312,0.39,-0.509,1.518,1.0631,0.0248,0.003,0.0,0.0,-1,0.2479,0.18826,-3.247,1.294,-0.982,1.013,0.2474,0.2575,0.1261,0.0,0.0,-1,0.5632,0.03632,-2.738,0.08,-0.021,0.09,0.034,0.0933,0.2946,0.0,0.0,28,0.6191,0.08681,-1.165,0.191,-0.541,0.37,0.0,0.0,0.002,0.0006,0.2503,-1,0.6127,0.03213,-2.7,0.08,0.941,1.267,0.1644,0.0,0.0,0.6718,0.0,28,0.669,0.03585,-1.907,0.658,-0.196,0.096,0.0,0.0,0.1124,0.7726,0.2789,28,0.6756,0.2,-4.236,0.507,1.254,0.509,0.1237,0.0002,0.0743,0.0,0.0,28,0.8287,0.09985,-1.427,0.556,-0.283,0.324,0.146,0.0,0.0,0.6266,0.0,28,0.7509,0.05483,-2.405,0.255,0.514,0.255,0.0,0.0,0.0008,0.7848,0.0094,28,0.953,0.2,-1.953,0.441,1.386,0.436,0.6463,0.06,0.002,0.0,0.0,28,0.8135,0.0905,-2.347,0.214,-1.378,0.723,0.0,0.0,0.8028,0.0039,0.3798,-1,1.047,0.11596,-2.598,0.141,-1.458,1.17,0.0,0.0,0.0042,0.0016,0.9785,-1,0.9439,0.04611,-2.542,0.08,1.348,0.568,0.0,0.0,0.2218,0.0979,0.0008,28,1.0068,0.03301,-2.598,0.08,1.353,0.583,0.0012,0.0,0.0,0.3691,0.0,28,1.1338,0.18125,-2.853,0.611,-1.749,0.63,0.0026,0.0,0.8251,0.0024,0.0,-1,1.1226,0.08054,-2.707,0.129,-0.573,0.08,0.0015,0.0,0.0,0.2976,0.0,-1,1.2284,0.18171,-3.735,0.371,-0.565,0.08,0.3843,0.0,0.0,0.0001,0.0,-1,1.0944,0.0725,-1.555,0.509,1.214,0.512,0.0124,0.0,0.0,0.6426,0.0,29,1.307,0.14533,-1.563,1.137,-0.643,0.08,0.0117,0.3719,0.2561,0.0,0.0,-1,1.11,0.06383,-3.001,0.158,-1.768,1.182,0.0,0.0,0.0043,0.0007,0.3248,-1,1.1998,0.12294,-4.177,0.538,-3.327,0.576,0.0,0.2018,0.1898,0.1391,0.0,-1,1.2758,0.04567,-2.282,0.348,-1.001,0.472,0.2788,0.0,0.0,0.291,0.0,30,1.5551,0.01891,-0.794,0.092,1.386,0.446,0.0,0.0,0.0035,0.0014,0.8404,33,1.3837,0.07194,-0.825,0.176,1.386,0.502,0.0,0.0,0.003,0.0011,0.6297,31,1.4528,0.02904,-3.109,0.149,-1.701,0.459,0.0,0.0,0.2869,0.0016,0.1949,32,1.4691,0.03321,-2.737,1.231,-1.0,0.35,0.8128,0.0,0.0,0.0158,0.0,32,1.6048,0.03407,-1.374,0.205,1.383,0.489,0.0,0.0,0.9508,0.0039,0.0974,33,1.6028,0.08211,-4.775,0.23,1.386,0.456,0.2231,0.0,0.0884,0.0009,0.0,33,1.6052,0.01486,-1.365,0.08,1.33,0.574,0.0,0.0,0.0708,0.4528,0.0024,33,1.7146,0.02801,-2.463,0.103,-1.288,0.479,0.0,0.0,0.3956,0.0356,0.3214,34,2.0507,0.10445,-2.982,0.351,-1.149,0.598,0.0313,0.3063,0.0108,0.0,0.0,-1,1.838,0.08732,-4.511,0.195,-0.847,0.552,0.1208,0.1581,0.0166,0.0,0.0,-1,1.7352,0.04433,-2.061,0.375,-0.676,0.08,0.5817,0.0148,0.0017,0.0,0.0,34,1.7177,0.01685,-1.92,0.08,-0.654,0.299,0.5559,0.0,0.0,0.1274,0.0,34,1.6912,0.2,-2.802,0.618,-1.739,0.576,0.0898,0.0936,0.13,0.0,0.0,-1,1.8079,0.05741,-3.212,0.08,0.256,0.968,0.0002,0.0,0.0176,0.0003,0.0,35,1.9953,0.08175,-0.982,0.246,-0.523,0.143,0.0137,0.0,0.006,0.0089,0.0,-1,2.1544,0.03948,-2.221,0.235,-1.555,1.6,0.0,0.0,0.0462,0.0005,0.001,36,2.0565,0.01761,0.035,0.581,-1.007,1.368,0.0002,0.0,0.0001,0.0005,0.0,37,2.2435,0.03362,-2.121,0.109,-1.622,0.417,0.0006,0.0,0.3772,0.0011,0.0,38,2.1755,0.10676,-3.972,0.558,-3.047,0.499,0.4781,0.0,0.001,0.084,0.0,-1,2.2655,0.02522,-2.083,0.08,-1.46,0.58,0.0,0.0,0.003,0.0013,0.6973,38,2.273,0.03092,-1.725,0.497,-0.405,0.767,1.1354,0.0,0.0,0.0,0.0,38,2.5057,0.06496,-3.182,0.179,-2.635,0.487,0.0,0.0,0.6797,0.0037,0.6388,-1,2.2545,0.13045,-4.104,0.267,-2.109,0.724,0.0,0.0,0.1401,0.0006,0.005,-1,2.3586,0.04699,-2.888,0.12,-2.253,1.211,0.0,0.0,0.0,0.421,0.4573,39,2.7186,0.06375,-3.541,0.281,-2.806,0.506,0.0,0.0,0.3611,0.304,0.0012,-1,2.4938,0.18285,-2.946,0.695,-0.905,1.416,1.642,0.0,0.0,0.0,0.0,-1,2.4806,0.02365,-0.407,0.173,1.386,0.431,0.0,0.0,0.0044,0.0016,1.0192,40,2.4895,0.01569,-1.878,0.08,1.386,0.543,0.7384,0.0,0.0,0.0002,0.0,40,2.4837,0.02519,-3.154,0.08,-1.258,0.347,0.1424,0.0,0.0,0.4594,0.0,40,2.5789,0.04454,-2.639,0.08,-1.366,0.474,0.0,0.0,0.0,0.1422,0.0002,41,2.7226,0.03651,-1.264,0.519,1.096,0.947,1.1552,0.0,0.0,0.0299,0.0,44,2.7312,0.02564,-2.997,0.083,-0.131,0.318,0.1826,0.0,0.0,0.1011,0.0,44,2.9169,0.2,-0.842,1.172,0.135,0.339,0.2094,0.3942,0.0013,0.0,0.0,43,2.7102,0.03283,-1.805,0.116,-1.252,0.86,0.0,0.0,0.005,0.002,1.2183,44,2.9128,0.03662,-0.667,0.377,1.386,0.477,0.0,0.5347,0.6901,0.0049,0.0,43,3.1434,0.03917,-1.049,0.249,1.03,1.021,0.0,0.0,0.0,0.2355,0.0022,42,2.9275,0.02417,-1.019,0.146,-0.04,1.043,0.0019,0.0,0.0,0.9482,0.0,43,2.9124,0.0408,-1.087,0.22,-0.555,0.403,0.0,0.0,0.3845,0.0025,0.6509,43,3.0011,0.0252,-1.944,0.288,-0.42,0.263,1.0417,0.0,0.0,0.1785,0.0,43,2.9941,0.02565,-2.149,0.09,-1.723,0.387,0.0,0.0,0.3154,0.0024,0.6304,43,3.0174,0.03192,-0.976,0.177,0.478,0.4,0.4728,0.0,0.4751,0.6068,0.0,43,2.7409,0.05629,-1.845,0.221,-0.709,0.724,0.0,0.0,0.3414,0.0015,0.0062,44]}/*END*/;
  var DEFAULTS = {
    colors: REF.colors.slice(),
    background: REF.background,
    glow: REF.glow,
    hue: 0, saturation: 1, exposure: 1, glowSize: 1,
    speed: 1, rotation: 0.01, twist: 0, pulse: 0, shimmer: 0,
    density: 1, width: 1, length: 1, softness: 1, fade: 1, core: 0, variety: 0.05,
    centerX: REF.centerX, centerY: REF.centerY, seed: 1, grain: 0.2, vignette: 0, loop: 0,
    contrast: 1, blackPoint: 0, highlights: 1, glowAmount: 1, bloom: 0, bloomSize: 1
  };
  options = options || {};
  var P = Object.assign({}, DEFAULTS, params || {});
  if (!Array.isArray(P.colors) || P.colors.length < 5) P.colors = DEFAULTS.colors.slice();

  var MAXN = 512, STRIDE = 12, NF = REF.s.length / STRIDE;
  var BETA = REF.beta, R_SPAWN = REF.rSpawn, LIFE = REF.life, F_FADE = 0.08;

  var VS = '#version 300 es\nin vec2 aPos;void main(){gl_Position=vec4(aPos,0.,1.);}';
  var FS = [
    '#version 300 es',
    'precision highp float; precision highp int; precision highp sampler2D;',
    'uniform vec2 uRes, uCenter;',
    'uniform float uRot, uZoom, uTwist, uFrame, uKap, uB0, uHole, uShimmer;',
    'uniform float uExposure, uSat, uGrain, uVignette, uGlowS;',
    'uniform float uContrast, uBlack, uHot, uBloom, uBloomW;',
    'uniform vec3 uBg, uGlow;',
    'uniform int uCount;',
    'uniform sampler2D uData;',
    'out vec4 outColor;',
    'const float TAU = 6.28318530718;',
    'uvec4 pcg4d(uvec4 v){',
    '  v = v * 1664525u + 1013904223u;',
    '  v.x += v.y * v.w; v.y += v.z * v.x; v.z += v.x * v.y; v.w += v.y * v.z;',
    '  v ^= v >> 16u;',
    '  v.x += v.y * v.w; v.y += v.z * v.x; v.z += v.x * v.y; v.w += v.y * v.z;',
    '  return v;',
    '}',
    'void main(){',
    '  vec2 frag = gl_FragCoord.xy;',
    '  float m = min(uRes.x, uRes.y);',
    '  vec2 p = (frag - (0.5 + uCenter) * uRes) / m;',
    '  float r = max(length(p), 1e-5);',
    '  float u = log(r) - uZoom;',
    '  float ang = atan(p.y, p.x) - uRot - uTwist * u;',
    // angular blur: the streak itself, a field-of-view term that grows with r, and a 1px floor
    '  float kr2 = uKap * uKap * r * r;',
    '  float b0 = max(uB0, 0.8 / m) / r;',
    '  float aa2 = b0 * b0;',
    '  vec3 acc = vec3(0.0), accB = vec3(0.0);',
    // bloom: the same streaks again with a much wider angular spread (fixed size on screen, capped near the center)
    '  float bw = min(1.2, uBloomW / r);',
    '  float bw2 = uBloom > 0.0 ? bw * bw : 0.0;',
    '  for (int i = 0; i < uCount; i++) {',
    '    vec4 a = texelFetch(uData, ivec2(i, 0), 0);',
    '    float d = ang - a.x; d -= TAU * floor(d / TAU + 0.5);',
    '    float se2 = a.y * a.y + kr2 + aa2;',
    '    float q = d * d / se2;',
    '    float sb2 = se2 + bw2;',
    '    float qb = d * d / sb2;',
    '    if (qb > 20.0) continue;',
    '    float e = smoothstep(a.z - a.w, a.z + a.w, u);',
    '    if (e <= 0.0) continue;',
    '    vec4 b = texelFetch(uData, ivec2(i, 1), 0);',
    '    e *= 1.0 - smoothstep(b.x - b.y, b.x + b.y, u);',
    '    if (uShimmer > 0.0) e *= max(0.0, 1.0 + uShimmer * 0.6 * sin(u * 9.0 - b.z));',
    '    vec3 c = texelFetch(uData, ivec2(i, 2), 0).rgb;',
    '    acc += c * (exp(-0.5 * q) * a.y * inversesqrt(se2) * e);',
    '    if (bw2 > 0.0) accB += c * (exp(-0.5 * qb) * a.y * inversesqrt(sb2) * e);',
    '  }',
    '  if (uHole > 0.0) { float hm = smoothstep(0.15 * uHole, uHole, r); acc *= hm; accB *= hm; }',
    // additive light over a dark base, per-channel film curve: hot overlaps go white, edges stay saturated
    '  vec3 lin = uBg + uGlow * exp(-r * r / (2.0 * uGlowS * uGlowS)) + (acc + accB * uBloom) * uExposure;',
    '  vec3 col = 1.0 - exp(-lin);',
    // highlights: 1 = per-channel curve (overlaps burn to white), 0 = hue-preserving curve (overlaps stay coloured)
    '  if (uHot != 1.0) {',
    '    float L = max(dot(lin, vec3(0.2126, 0.7152, 0.0722)), 1e-6);',
    '    vec3 keep = min(lin * ((1.0 - exp(-L)) / L), vec3(1.0));',
    '    col = clamp(mix(keep, col, uHot), 0.0, 1.0);',
    '  }',
    '  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));',
    '  col = clamp(mix(vec3(lum), col, uSat), 0.0, 1.0);',
    '  vec2 qv = (frag / uRes - 0.5) * 2.0;',
    '  col *= 1.0 - uVignette * smoothstep(0.4, 1.6, length(qv));',
    '  vec3 srgb = mix(col * 12.92, 1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));',
    '  srgb = (srgb - 0.4) * uContrast + 0.4;',
    '  srgb = (srgb - uBlack) / (1.0 - uBlack);',
    '  uvec4 n = pcg4d(uvec4(uvec2(frag), uint(uFrame), 77u));',
    '  vec3 nz = vec3(n.xyz) * (1.0 / 4294967295.0) - 0.5;',
    '  float gr = (nz.x + nz.y + nz.z) * 0.6667;',
    '  srgb += gr * (uGrain * 0.09) + nz * (1.0 / 255.0);',
    '  outColor = vec4(clamp(srgb, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  var gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL2 is not available');
  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ['uRes', 'uCenter', 'uRot', 'uZoom', 'uTwist', 'uFrame', 'uKap', 'uB0', 'uHole', 'uShimmer', 'uExposure', 'uSat',
    'uGrain', 'uVignette', 'uGlowS', 'uContrast', 'uBlack', 'uHot', 'uBloom', 'uBloomW', 'uBg', 'uGlow', 'uCount', 'uData'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  var tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, MAXN, 3, 0, gl.RGBA, gl.FLOAT, null);
  gl.uniform1i(U.uData, 0);
  var data = new Float32Array(MAXN * 3 * 4);

  // colour: hex (sRGB) -> hue-shifted in OKLCH -> linear RGB
  function hexLin(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
  }
  function hueLin(rgb, deg) {
    if (!deg) return rgb;
    var r = rgb[0], g = rgb[1], b = rgb[2];
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    var A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    var B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    var c = Math.cos(deg * Math.PI / 180), sn = Math.sin(deg * Math.PI / 180);
    var A2 = A * c - B * sn, B2 = A * sn + B * c;
    l = Math.pow(L + 0.3963377774 * A2 + 0.2158037573 * B2, 3);
    m = Math.pow(L - 0.1055613458 * A2 - 0.0638541728 * B2, 3);
    s = Math.pow(L - 0.0894841775 * A2 - 1.2914855480 * B2, 3);
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    ].map(function (v) { return Math.max(0, v); });
  }
  function lin(hex) { return hueLin(hexLin(hex), P.hue); }

  // ---------- streaks ----------
  // fitted streak i: s[i*12 + 0..11] = theta, sigma, ua, ha, ub, hb, w0..w4 (palette weights), lobe (-1 = ambient)
  function hash(a, b, c) {
    var h = Math.imul(a | 0, 0x9E3779B1) ^ Math.imul(b | 0, 0x85EBCA77) ^ Math.imul(c | 0, 0xC2B2AE3D);
    h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; h = Math.imul(h, 0x297A2D39); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  var TAU = Math.PI * 2, HA_CAP = 1.6, OPEN_U = Math.log(0.15);
  var QS = Math.pow(R_SPAWN, -BETA);
  function qOf(uu) { return Math.exp(-BETA * uu); }
  function uOf(q) { return q > 1e-9 ? -Math.log(q) / BETA : 60; }
  var AMB = [], LOBES = [];
  for (var i = 0; i < NF; i++) {
    var o = i * STRIDE, ua = REF.s[o + 2];
    var at = { th: REF.s[o], sg: REF.s[o + 1], ua: ua, ha: REF.s[o + 3], hb: REF.s[o + 5],
      ub0: REF.s[o + 4], lu: Math.max(0.05, REF.s[o + 4] - ua), w: REF.s.slice(o + 6, o + 11), cl: REF.s[o + 11],
      // long fans (tails already past ~quarter height in the reference) run off the frame wherever the lobe is
      open: REF.s[o + 4] - REF.s[o + 5] > OPEN_U };
    if (at.cl < 0) AMB.push(at); else (LOBES[at.cl] = LOBES[at.cl] || { atoms: [] }).atoms.push(at);
  }
  LOBES = LOBES.filter(Boolean);
  // a lobe moves as one rigid piece in log-radius, measured from its innermost head
  LOBES.forEach(function (L, k) {
    var u0 = Infinity, out = 0;
    L.atoms.forEach(function (a) { u0 = Math.min(u0, a.ua); });
    L.atoms.forEach(function (a) { a.off = a.ua - u0; out = Math.max(out, Math.min(HA_CAP, a.ha * 1.5) - a.off); });
    L.qe = qOf(Math.log(1.45) + out);                         // gone once every head is past the frame corners
    L.f0 = Math.min(0.999, (QS - qOf(u0)) / (QS - L.qe));     // < 0 when the lobe starts inside the spawn radius
    L.rate = (0.85 + 0.35 * hash(k, 5, 17)) / LIFE;           // slightly different speeds, so lobes drift out of step
  });
  var NL = LOBES.length;

  var flow = 0, rot = 0, tau = 0, frame = 0, playing = options.autoplay !== false, raf = 0, last = 0, visible = true;
  var t0 = options.start != null ? options.start : 0;
  tau = t0; flow = t0 * P.speed; rot = t0 * rotSpeed();
  function loopP() { return P.loop > 0 ? P.loop * Math.max(0.01, Math.abs(P.speed)) : 0; }
  function rotSpeed() {
    // in loop mode rotation snaps to whole turns per loop so the clip repeats seamlessly
    if (P.loop > 0) return Math.round(P.rotation * P.loop / TAU) * TAU / P.loop;
    return P.rotation;
  }
  function pulsePeriod() {
    var T = 7;
    if (P.loop > 0) { var lp = loopP(); return lp / Math.max(1, Math.round(lp / T)); }
    return T;
  }

  function fill(f) {
    var seed = Math.max(1, Math.round(P.seed)) | 0;
    var dens = Math.max(0.05, P.density), lp = loopP();
    var rot0 = seed === 1 ? 0 : hash(seed, 0, 911) * TAU;
    var pal = [];
    for (var k = 0; k < 5; k++) pal.push(lin(P.colors[k] || P.colors[P.colors.length - 1]));
    var n = 0;
    function put(a, th, ua, vis, sh, first) {
      if (n >= MAXN) return;
      var o = n * 4, o1 = (MAXN + n) * 4, o2 = (2 * MAXN + n) * 4;
      data[o] = th; data[o + 1] = a.sg * P.width; data[o + 2] = ua; data[o + 3] = Math.min(HA_CAP, a.ha * P.fade);
      var ub;
      if (a.open) {
        ub = ua + 8 * P.length;
        // on the fitted first trip the tail starts at its reference length and runs off the frame as the lobe moves
        if (first) ub = Math.min(ub, a.ub0 + 3 * (ua - a.ua));
      } else ub = ua + a.lu * P.length;
      data[o1] = Math.max(ub, ua + 0.05); data[o1 + 1] = a.hb; data[o1 + 2] = sh; data[o1 + 3] = 0;
      var cr = 0, cg = 0, cb = 0;
      for (var j = 0; j < 5; j++) { var w = a.w[j]; if (w) { cr += w * pal[j][0]; cg += w * pal[j][1]; cb += w * pal[j][2]; } }
      data[o2] = cr * vis; data[o2 + 1] = cg * vis; data[o2 + 2] = cb * vis; data[o2 + 3] = 0;
      n++;
    }
    // ambient glow wedges: fixed in place (they still turn with Spin in the shader)
    for (var i = 0; i < AMB.length; i++) put(AMB[i], AMB[i].th + rot0, AMB[i].ua, 1, i, true);
    var total = Math.round(NL * Math.max(1, dens));
    for (var s = 0; s < total; s++) {
      if (s < NL && dens < 1 && hash(s, 31, seed) > dens) continue;
      var L = LOBES[s % NL], fit0 = seed === 1 && s < NL;
      var rate = L.rate * (s < NL ? 1 : 0.9 + 0.25 * hash(s, 6, seed)), per = 0;
      if (lp > 0) { per = Math.max(1, Math.round(rate * lp)); rate = per / lp; }
      var f0 = fit0 ? L.f0 : hash(s, 0, seed * 7 + 3);
      if (lp > 0) f0 = Math.max(0, f0);
      var ph = f0 + rate * f, g = Math.floor(ph), fr = ph - g;
      if (fit0 && f0 < 0 && ph >= f0 && ph < 0) { g = 0; fr = ph; }   // first trip of a lobe that starts near the center
      var gi = per ? ((g % per) + per) % per : g;
      // every trip after the first comes back nudged in angle (Variety); copies from Density get a bigger nudge
      var dth = (gi === 0 && fit0) ? 0 : rot0 + (hash(s, gi, seed * 7 + 2) * 2 - 1) * Math.PI * Math.min(1, P.variety + (s < NL ? 0 : 0.35));
      // fade in after a respawn (the fitted opening frame is already fully in)
      var fw = (gi === 0 && fit0) ? Math.min(F_FADE, f0) : F_FADE;
      var vis = fw > 0 ? Math.min(1, fr / fw) : 1; vis = vis * vis * (3 - 2 * vis);
      var uref = uOf(QS + (L.qe - QS) * fr), sh = hash(s, g, 77) * TAU + f * 6;
      var first = gi === 0 && fit0;
      for (var j = 0; j < L.atoms.length; j++) { var a = L.atoms[j]; put(a, a.th + dth, uref + a.off, vis, sh, first); }
    }
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, MAXN, 3, gl.RGBA, gl.FLOAT, data);
    return n;
  }

  function draw(at) {
    var f = at ? at.flow : flow, ro = at ? at.rot : rot;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(U.uCount, fill(f));
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform2f(U.uCenter, P.centerX, P.centerY);
    gl.uniform1f(U.uRot, ro);
    gl.uniform1f(U.uZoom, P.pulse * 0.35 * Math.sin(TAU * f / pulsePeriod()));
    gl.uniform1f(U.uTwist, P.twist);
    gl.uniform1f(U.uFrame, at && at.frame != null ? at.frame : frame);
    // Edge blur: 0 = no field-of-view term, 1 = fitted to the reference, above 1 the sides go much softer
    gl.uniform1f(U.uKap, P.softness <= 1 ? REF.kap * P.softness : REF.kap + (P.softness - 1) * 0.01);
    gl.uniform1f(U.uB0, REF.b0);
    gl.uniform1f(U.uHole, P.core * 0.3);
    gl.uniform1f(U.uShimmer, P.shimmer);
    gl.uniform1f(U.uExposure, P.exposure);
    gl.uniform1f(U.uSat, P.saturation);
    gl.uniform1f(U.uGrain, P.grain);
    gl.uniform1f(U.uVignette, P.vignette);
    gl.uniform1f(U.uGlowS, REF.glowS * Math.max(0.05, P.glowSize));
    gl.uniform3fv(U.uBg, lin(P.background));
    var gw = lin(P.glow);
    var gk = REF.glowK * Math.max(0, P.glowAmount);
    gl.uniform3f(U.uGlow, gw[0] * gk, gw[1] * gk, gw[2] * gk);
    gl.uniform1f(U.uContrast, P.contrast);
    gl.uniform1f(U.uBlack, Math.min(0.9, P.blackPoint));
    gl.uniform1f(U.uHot, P.highlights);
    gl.uniform1f(U.uBloom, P.bloom * 0.5);
    gl.uniform1f(U.uBloomW, 0.035 * Math.max(0.05, P.bloomSize));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (!visible) return;
    if (playing) {
      tau += dt; flow += dt * P.speed; rot += dt * rotSpeed(); frame++;
      if (P.loop > 0) { var lp = loopP(); if (lp > 0) flow = ((flow % lp) + lp) % lp; rot = rot % TAU; }
    }
    if (options.autoResize !== false) fit();
    draw();
  }

  function fit() {
    var dpr = Math.min(window.devicePixelRatio || 1, options.maxDpr || 2);
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  var io = null;
  if (options.pauseOffscreen !== false && 'IntersectionObserver' in window) {
    io = new IntersectionObserver(function (e) { visible = e[0].isIntersecting; });
    io.observe(canvas);
  }
  if (options.animate !== false) raf = requestAnimationFrame(tick);

  return {
    get params() { return JSON.parse(JSON.stringify(P)); },
    get playing() { return playing; },
    get time() { return tau; },
    // live clock, so exports can start exactly on the frame you see
    get clock() { return { flow: flow, rot: rot, frame: frame }; },
    rotSpeed: rotSpeed,
    set: function (patch) { Object.assign(P, patch); },
    play: function () { playing = true; },
    pause: function () { playing = false; },
    toggle: function () { playing = !playing; return playing; },
    seek: function (t) { tau = t; flow = t * P.speed; rot = t * rotSpeed(); },
    // draw now, or at an explicit {flow, rot, frame}
    draw: function (at) { draw(at); },
    renderAt: function (t, fr) { draw({ flow: t * P.speed, rot: t * rotSpeed(), frame: fr != null ? fr : Math.round(t * 60) }); },
    gl: gl,
    destroy: function () {
      cancelAnimationFrame(raf); if (io) io.disconnect();
      var x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext();
    }
  };
}
