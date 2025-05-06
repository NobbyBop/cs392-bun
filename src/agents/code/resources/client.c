/*Nicholas Mirigliani
I pledge my honor that I have abided by the Stevens Honor System. */
#include <stdio.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/select.h>
#include <stdlib.h>
#include <getopt.h>

int main(int argc, char *argv[]){
    fflush(stdout);

    char *ip = "127.0.0.1";
    int port = 25555;

    int opt;
    opterr = 0; //Disable default error message.
    while ((opt = getopt(argc, argv, "i:p:h")) != -1) {
        switch (opt) {
            case 'i':
                ip = optarg;
                break;
            case 'p':
                port = atoi(optarg);
                if(port==0 && strcmp(optarg, "0") != 0){
                  perror("atoi");
                  exit(EXIT_FAILURE);
                }
                break;
            case 'h':
                printf("Usage: %s [-i IP_address] [-p port_number] [-h]\n", argv[0]);
                printf("  -i IP_address Default to \"127.0.0.1\";\n");
                printf("  -p port_number Default to 25555;\n");
                printf("  -h Display this help info.\n");
                exit(EXIT_SUCCESS);
            default:
                fprintf(stderr, "Error: Unknown option '-%c' received.\n", optopt);
                exit(EXIT_FAILURE);
        }
    }

    int server_fd;
    struct sockaddr_in server_addr;
    socklen_t addr_size = sizeof(server_addr);

    /* STEP 1: Create a socket to talk to the server */
    server_fd = socket(AF_INET, SOCK_STREAM, 0);

    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(port);
    server_addr.sin_addr.s_addr = inet_addr(ip);

    /* STEP 2: Try to connect to the server */
    if(connect(server_fd, (struct sockaddr *) &server_addr, addr_size) == -1){
      perror("connect");
      exit(EXIT_FAILURE);
    }

    char buffer[4000];
    int sentName = 0;
    while (1) {
      fd_set read_fds;
      FD_ZERO(&read_fds);
      FD_SET(server_fd, &read_fds);
      FD_SET(STDIN_FILENO, &read_fds);

      select(server_fd + 1, &read_fds, NULL, NULL, NULL);

      if (FD_ISSET(server_fd, &read_fds)) {
        // Receive message from the server.
        int recvbytes = recv(server_fd, buffer, sizeof(buffer) - 1, 0);
        if (recvbytes == 0) {
            printf("Connection closed by the server.\n");
            break;
        } else if (recvbytes == -1){
          perror("recv");
          exit(EXIT_FAILURE);
        }

        buffer[recvbytes] = '\0';
        printf("%s", buffer);
        fflush(stdout);
      }

      if (FD_ISSET(STDIN_FILENO, &read_fds)) {
        // If the client hasn't given its name yet.
        if (!sentName) {
            fflush(stdout);
            fgets(buffer, sizeof(buffer), stdin);
            buffer[strcspn(buffer, "\n")] = '\0';
            if(send(server_fd, buffer, strlen(buffer), 0) == -1){
              perror("send");
              exit(EXIT_FAILURE);
            }
            sentName = 1;

        // Otherwise receive its answer.
        } else {
            fflush(stdout);
            fgets(buffer, sizeof(buffer), stdin);
            buffer[strcspn(buffer, "\n")] = '\0';
            if(send(server_fd, buffer, strlen(buffer), 0) == -1){
              perror("send");
              exit(EXIT_FAILURE);
            }
        }
      }
    }

    close(server_fd);
    return 0;
}