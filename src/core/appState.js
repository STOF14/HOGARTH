export class AppState {
  constructor(){
    this.state = null; this.states = {};
  }
  register(name, obj){ this.states[name] = obj; }
  async go(name, ...args){
    if (this.state && this.states[this.state] && this.states[this.state].exit) await this.states[this.state].exit();
    this.state = name;
    if (this.states[name] && this.states[name].enter) await this.states[name].enter(...args);
  }
}
