import {
  XHRBackend,
  HttpClient,
  BaseRequestOptions,
  Response,
  ResponseOptions,
  RequestOptions,
  RequestMethod,
  URLSearchParams
} from '@angular/common/http';
import { MockBackend, MockConnection } from '@angular/http/testing';
import { HttpExtension } from '../extensions';

export function createHttp(
  backend: MockBackend,
  options: BaseRequestOptions,
  realBackend: XHRBackend
) {
  // configure fake backend
  backend.connections.subscribe((connection: MockConnection) => {
    let testUser = {
      username: 'test',
      password: 'test',
      firstName: 'Test',
      lastName: 'User'
    };

    // wrap in timeout to simulate server api call
    setTimeout(() => {
      // fake authenticate api end point
      if (
        connection.request.url.endsWith('/token') &&
        connection.request.method === RequestMethod.Post
      ) {
        // get parameters from post request

        var params = new URLSearchParams(connection.request.getBody());
        HttpExtension.fetchAsJson('assets/data/mocks/users.json').subscribe(
          (value: any) => {
            let user = value.find(elm => {
              return (
                elm.username === params.get('username') &&
                elm.password === params.get('password')
              );
            });
            if (!user) {
              connection.mockRespond(
                new Response(
                  new ResponseOptions({
                    status: 404,
                    body: { error: 'invalid_grant' }
                  })
                )
              );
              return;
            }

            connection.mockRespond(
              new Response(
                new ResponseOptions({
                  status: 200,
                  body: user.tokens[params.get('grant_type')]
                })
              )
            );
          },
          (error: any) => {},
          () => {}
        );
        return;
      }

      //REF: http://jasonwatmore.com/post/2016/11/24/angular-2-mockbackend-example-for-backendless-development
      // pass through any requests not handled above (updated with suggestion from Ryan's comment to include all request options)
      let realHttp = new HttpClient(realBackend, options);
      const requestOptions = {
        method: connection.request.method,
        headers: connection.request.headers,
        body: connection.request.getBody(),
        url: connection.request.url,
        withCredentials: connection.request.withCredentials,
        responseType: connection.request.responseType
      };
      realHttp.request(connection.request.url, requestOptions).subscribe(
        (response: Response) => {
          connection.mockRespond(response);
        },
        (error: any) => {
          connection.mockError(error);
        }
      );
    }, 500);
  });

  return new Http(backend, options);
}

export let backendMockProvider = {
  // use fake backend in place of Http service for backend-less development
  provide: HttpClient,
  useFactory: createHttp,
  deps: [MockBackend, BaseRequestOptions, XHRBackend]
};
