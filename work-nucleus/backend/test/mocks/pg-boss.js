class PgBoss {
  on() {}
  async start() {
    return this;
  }
  async stop() {}
  async getQueue() {
    return null;
  }
  async createQueue() {}
}

module.exports = { PgBoss };
