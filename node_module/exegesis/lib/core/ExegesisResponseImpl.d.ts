/// <reference types="node" />
/// <reference types="node" />
import * as http from 'http';
import * as net from 'net';
import * as types from '../types';
import { HttpHeaders } from '../types';
export default class ExegesisResponseImpl implements types.ExegesisResponse {
    private _body;
    _afterController: boolean;
    statusCode: number;
    statusMessage: string | undefined;
    headers: types.HttpHeaders;
    ended: boolean;
    connection: net.Socket;
    socket: net.Socket;
    headersSent: boolean;
    private _responseValidationEnabled;
    constructor(res: http.ServerResponse, responseValidationEnabled: boolean);
    setStatus(status: number): this;
    status(status: number): this;
    header(header: string, value: number | string | string[]): this;
    set(header: string, value: number | string | string[]): this;
    json(json: any): this;
    pureJson(json: any): this;
    setBody(body: any): this;
    set body(body: any);
    get body(): any;
    end(): void;
    redirect(status: number, url: string): this;
    redirect(url: string): this;
    setHeader(name: string, value: number | string | string[]): void;
    getHeader(name: string): string | number | string[];
    getHeaderNames(): string[];
    getHeaders(): types.HttpHeaders;
    hasHeader(name: string): boolean;
    removeHeader(name: string): void;
    writeHead(statusCode: number, statusMessage?: string | HttpHeaders, headers?: HttpHeaders): void;
}
