import { Component, OnDestroy } from '@angular/core';
import { OpenAIApi } from "openai";
import { environment } from "../../environments/environment";
import { HttpClient, HttpHeaders} from "@angular/common/http";
import { map, Observable, Subject, takeUntil, tap} from "rxjs";
import { APIResponse, Message } from "./models/chat.model";

const OPENAI_API_KEY: string = environment.openAIApiKey;
const OPENAI_API_URL: string = environment.openAIAPIUrl;

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnDestroy{
  API_KEY = OPENAI_API_KEY;
  API_URL = OPENAI_API_URL;
  private openai: OpenAIApi;

  inputText = '';
  messages: Message[] = [];

  messages$!: Observable<Message>;

  /**
   * Ojo debe ser Subject para que no emita al principio.
   */
  unsubscribe$: Subject<boolean> = new Subject<boolean>();
  isLoading: boolean = false;

  constructor(private httpClients: HttpClient) {
    this.openai = new OpenAIApi({
      apiKey: this.API_KEY,
      isJsonMime(): boolean {
        return true;
      }
    });
  }

  /**
   * Aqui es interesante ver como le agregamos el parametro time que no viene en el mensaje sino en el padre.
   * Otros:
   *  - Usamos el map para devolver el array de mensajes en ves de la response completa. Por eso veos un type en el post
   * y otro en el metodo.
   * - Ojo este observable no recibe subscripcion aqui. En esta caso ademas no se necesita unsubscribe por ser un httpclient
   */
  makeTheRequest(): Observable<Message & {time: number}> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer '+ this.API_KEY
    });
    return this.httpClients.post<APIResponse>(this.API_URL, {
      "model": "gpt-3.5-turbo",
      "messages":[{"role": "user", "content": this.inputText}],
      "temperature":0.7
    },
      {
        headers
      }
    ).pipe(
      map(response => ({...response.choices[0].message, time: response.created}))
    );
  }

  sendMessage(): void | undefined {
    if (!this.inputText) {
      return;
    }
    this.isLoading = true;
    /*
    * Aqui hacemos el pipe porque esta en el ambito de este metodo transformarlo y no en la request, que podria estar en
    * un servicio separado de este archivo por ejemplo.
    * Tenemos que subscribirnos para q se ejecute la peticion.
    * Aqui es como si hicieramos el pipe sobre this.messages$
    * */
    this.messages$ = this.makeTheRequest().pipe(
      takeUntil(this.unsubscribe$),
      tap(message => this.messages.push(message)),
      tap(__ => this.isLoading = false)
    );
    this.messages$.subscribe();
  }

  ngOnDestroy() {
    this.unsubscribe$.next(true);
    this.unsubscribe$.complete();
  }
}
