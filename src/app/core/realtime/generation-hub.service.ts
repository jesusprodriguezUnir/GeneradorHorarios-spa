import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';

export interface ProgressMessage {
  assigned: number;
  total: number;
  percentage: number;
  currentAction: string;
}

@Injectable({ providedIn: 'root' })
export class GenerationHubService {
  private hubConnection?: signalR.HubConnection;

  private readonly _state = signal<'disconnected' | 'connecting' | 'connected'>('disconnected');
  readonly state = this._state.asReadonly();

  private readonly _progress = signal<ProgressMessage | null>(null);
  readonly progress = this._progress.asReadonly();

  async start(schoolId: string): Promise<void> {
    if (this.hubConnection) {
      await this.stop();
    }

    this._state.set('connecting');
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.signalrUrl)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.onreconnecting(() => this._state.set('connecting'));
    this.hubConnection.onreconnected(() => this._state.set('connected'));
    this.hubConnection.onclose(() => this._state.set('disconnected'));

    this.hubConnection.on('Progress', (msg: ProgressMessage) => {
      this._progress.set(msg);
    });

    try {
      await this.hubConnection.start();
      this._state.set('connected');
      if (schoolId) {
        await this.hubConnection.invoke('JoinSchoolGroup', schoolId).catch(() => {});
      }
    } catch (err) {
      this._state.set('disconnected');
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
      } catch {
        // ignore errors on stop
      }
      this.hubConnection = undefined;
    }
    this._state.set('disconnected');
    this._progress.set(null);
  }
}
