// Regiones y comunas de Chile (16 regiones, 346 comunas).
// `id` = número oficial de la región; `order` = orden geográfico norte -> sur.

export type RegionSeed = { id: number; code: string; name: string; order: number; comunas: string[] };

export const REGIONES: RegionSeed[] = [
  { id: 15, code: "XV", name: "Arica y Parinacota", order: 1, comunas: ["Arica", "Camarones", "Putre", "General Lagos"] },
  { id: 1, code: "I", name: "Tarapacá", order: 2, comunas: ["Iquique", "Alto Hospicio", "Pozo Almonte", "Camiña", "Colchane", "Huara", "Pica"] },
  {
    id: 2, code: "II", name: "Antofagasta", order: 3,
    comunas: ["Antofagasta", "Mejillones", "Sierra Gorda", "Taltal", "Calama", "Ollagüe", "San Pedro de Atacama", "Tocopilla", "María Elena"],
  },
  {
    id: 3, code: "III", name: "Atacama", order: 4,
    comunas: ["Copiapó", "Caldera", "Tierra Amarilla", "Chañaral", "Diego de Almagro", "Vallenar", "Alto del Carmen", "Freirina", "Huasco"],
  },
  {
    id: 4, code: "IV", name: "Coquimbo", order: 5,
    comunas: [
      "La Serena", "Coquimbo", "Andacollo", "La Higuera", "Paihuano", "Vicuña", "Illapel", "Canela", "Los Vilos", "Salamanca",
      "Ovalle", "Combarbalá", "Monte Patria", "Punitaqui", "Río Hurtado",
    ],
  },
  {
    id: 5, code: "V", name: "Valparaíso", order: 6,
    comunas: [
      "Valparaíso", "Casablanca", "Concón", "Juan Fernández", "Puchuncaví", "Quintero", "Viña del Mar", "Isla de Pascua",
      "Los Andes", "Calle Larga", "Rinconada", "San Esteban", "La Ligua", "Cabildo", "Papudo", "Petorca", "Zapallar",
      "Quillota", "La Calera", "Hijuelas", "La Cruz", "Nogales", "San Antonio", "Algarrobo", "Cartagena", "El Quisco",
      "El Tabo", "Santo Domingo", "San Felipe", "Catemu", "Llaillay", "Panquehue", "Putaendo", "Santa María", "Quilpué",
      "Limache", "Olmué", "Villa Alemana",
    ],
  },
  {
    id: 13, code: "RM", name: "Metropolitana de Santiago", order: 7,
    comunas: [
      "Santiago", "Cerrillos", "Cerro Navia", "Conchalí", "El Bosque", "Estación Central", "Huechuraba", "Independencia",
      "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina", "Las Condes", "Lo Barnechea", "Lo Espejo", "Lo Prado",
      "Macul", "Maipú", "Ñuñoa", "Pedro Aguirre Cerda", "Peñalolén", "Providencia", "Pudahuel", "Quilicura", "Quinta Normal",
      "Recoleta", "Renca", "San Joaquín", "San Miguel", "San Ramón", "Vitacura", "Puente Alto", "Pirque", "San José de Maipo",
      "Colina", "Lampa", "Tiltil", "San Bernardo", "Buin", "Calera de Tango", "Paine", "Melipilla", "Alhué", "Curacaví",
      "María Pinto", "San Pedro", "Talagante", "El Monte", "Isla de Maipo", "Padre Hurtado", "Peñaflor",
    ],
  },
  {
    id: 6, code: "VI", name: "Libertador General Bernardo O'Higgins", order: 8,
    comunas: [
      "Rancagua", "Codegua", "Coinco", "Coltauco", "Doñihue", "Graneros", "Las Cabras", "Machalí", "Malloa", "Mostazal",
      "Olivar", "Peumo", "Pichidegua", "Quinta de Tilcoco", "Rengo", "Requínoa", "San Vicente", "Pichilemu", "La Estrella",
      "Litueche", "Marchigüe", "Navidad", "Paredones", "San Fernando", "Chépica", "Chimbarongo", "Lolol", "Nancagua",
      "Palmilla", "Peralillo", "Placilla", "Pumanque", "Santa Cruz",
    ],
  },
  {
    id: 7, code: "VII", name: "Maule", order: 9,
    comunas: [
      "Talca", "Constitución", "Curepto", "Empedrado", "Maule", "Pelarco", "Pencahue", "Río Claro", "San Clemente", "San Rafael",
      "Cauquenes", "Chanco", "Pelluhue", "Curicó", "Hualañé", "Licantén", "Molina", "Rauco", "Romeral", "Sagrada Familia",
      "Teno", "Vichuquén", "Linares", "Colbún", "Longaví", "Parral", "Retiro", "San Javier", "Villa Alegre", "Yerbas Buenas",
    ],
  },
  {
    id: 16, code: "XVI", name: "Ñuble", order: 10,
    comunas: [
      "Chillán", "Bulnes", "Chillán Viejo", "El Carmen", "Pemuco", "Pinto", "Quillón", "San Ignacio", "Yungay", "Quirihue",
      "Cobquecura", "Coelemu", "Ninhue", "Portezuelo", "Ránquil", "Treguaco", "San Carlos", "Coihueco", "Ñiquén",
      "San Fabián", "San Nicolás",
    ],
  },
  {
    id: 8, code: "VIII", name: "Biobío", order: 11,
    comunas: [
      "Concepción", "Coronel", "Chiguayante", "Florida", "Hualqui", "Lota", "Penco", "San Pedro de la Paz", "Santa Juana",
      "Talcahuano", "Tomé", "Hualpén", "Lebu", "Arauco", "Cañete", "Contulmo", "Curanilahue", "Los Álamos", "Tirúa",
      "Los Ángeles", "Antuco", "Cabrero", "Laja", "Mulchén", "Nacimiento", "Negrete", "Quilaco", "Quilleco", "San Rosendo",
      "Santa Bárbara", "Tucapel", "Yumbel", "Alto Biobío",
    ],
  },
  {
    id: 9, code: "IX", name: "La Araucanía", order: 12,
    comunas: [
      "Temuco", "Carahue", "Cunco", "Curarrehue", "Freire", "Galvarino", "Gorbea", "Lautaro", "Loncoche", "Melipeuco",
      "Nueva Imperial", "Padre Las Casas", "Perquenco", "Pitrufquén", "Pucón", "Saavedra", "Teodoro Schmidt", "Toltén",
      "Vilcún", "Villarrica", "Cholchol", "Angol", "Collipulli", "Curacautín", "Ercilla", "Lonquimay", "Los Sauces", "Lumaco",
      "Purén", "Renaico", "Traiguén", "Victoria",
    ],
  },
  {
    id: 14, code: "XIV", name: "Los Ríos", order: 13,
    comunas: ["Valdivia", "Corral", "Lanco", "Los Lagos", "Máfil", "Mariquina", "Paillaco", "Panguipulli", "La Unión", "Futrono", "Lago Ranco", "Río Bueno"],
  },
  {
    id: 10, code: "X", name: "Los Lagos", order: 14,
    comunas: [
      "Puerto Montt", "Calbuco", "Cochamó", "Fresia", "Frutillar", "Los Muermos", "Llanquihue", "Maullín", "Puerto Varas",
      "Castro", "Ancud", "Chonchi", "Curaco de Vélez", "Dalcahue", "Puqueldón", "Queilén", "Quellón", "Quemchi", "Quinchao",
      "Osorno", "Puerto Octay", "Purranque", "Puyehue", "Río Negro", "San Juan de la Costa", "San Pablo", "Chaitén",
      "Futaleufú", "Hualaihué", "Palena",
    ],
  },
  {
    id: 11, code: "XI", name: "Aysén del General Carlos Ibáñez del Campo", order: 15,
    comunas: ["Coyhaique", "Lago Verde", "Aysén", "Cisnes", "Guaitecas", "Cochrane", "O'Higgins", "Tortel", "Chile Chico", "Río Ibáñez"],
  },
  {
    id: 12, code: "XII", name: "Magallanes y de la Antártica Chilena", order: 16,
    comunas: [
      "Punta Arenas", "Laguna Blanca", "Río Verde", "San Gregorio", "Cabo de Hornos", "Antártica", "Porvenir", "Primavera",
      "Timaukel", "Natales", "Torres del Paine",
    ],
  },
];
