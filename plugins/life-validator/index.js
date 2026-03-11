module.exports = {
  name: "life-validator",
  version: "2.0.0",
  async assemble(ctx) {
    return { prompt: ctx.basePrompt + "\n【验证层】\n" };
  }
};
