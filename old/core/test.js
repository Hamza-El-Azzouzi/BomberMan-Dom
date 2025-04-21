
const entities = []
const components = new Map()

function createEntity() {
    const id = entities.length;
    entities.push(id)
    return id;
}

function addComponent(entity, name, data) {
    if (!components.has(name)) 
        components.set(name, new Map())
    components.get(name).set(entity, data)
}

function movLeftSystem() {
    for (let entity of entities) {
        const movData = components?.get("mov")?.get(entity)
        movData.x += 0.05
    }
}

const player = createEntity();
addComponent(player, "mov", {x: 5, y:z})

function loop() {
    movLeftSystem()
    requestAnimationFrame(loop)
}

