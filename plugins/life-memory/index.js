module.exports = {
  name: "life-memory",
  version: "2.0.0",
  async bootstrap() { return { status: "ok" }; },
  async afterTurn() { return { saved: true }; }
};
