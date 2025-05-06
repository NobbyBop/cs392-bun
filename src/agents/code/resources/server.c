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
#include <signal.h>

#define MAX_CONN 3

int server_fd = -1;
int cfds[MAX_CONN];

void close_connections(int server_fd, int* cfds) {
    if (server_fd != -1) {
        close(server_fd);
    }

    for (int i = 0; i < MAX_CONN; i++) {
        if (cfds[i] != -1) {
            close(cfds[i]);
        }
    }
}

struct Entry{
    char prompt[1024];
    char options[3][50];
    int answer_idx;
};

struct Player{
    int fd;
    int score;
    char name[128];
};

// Task 1.2
int read_questions(struct Entry *arr, char *filename) {
    FILE *file = fopen(filename, "r");
    if (file == NULL) {
        perror("fopen");
        exit(EXIT_FAILURE);
    }
    int num_questions = 0;
    char line[1024];
    while (fgets(line, sizeof(line), file) != NULL) {
        //Skip the empty line between questions.
        if (strcmp(line, "\n")!=0) {  
            //First line: prompt.
            strcpy(arr[num_questions].prompt, line);

            //Second line: 3 options.
            fgets(line, sizeof(line), file);
            char *option = strtok(line, " ");
            int idx = 0;
            while (option != NULL) {
                strcpy(arr[num_questions].options[idx++], option);
                option = strtok(NULL, " ");
            }

            //Third line: answer.
            fgets(line, sizeof(line), file);
            for (int i = 0; i < 3; i++) {
                if (strcmp(line, arr[num_questions].options[i]) == 0) {
                    arr[num_questions].answer_idx = i;
                    break;
                }
            }
            num_questions++;
        }
    }
    fclose(file);
    return num_questions;
}

// End: Task 1.2

int main(int argc, char *argv[]){
    fflush(stdout);
    // Task 1.1 Establish the Server with getopt
    char *qfile = "question.txt";
    char *ip = "127.0.0.1";
    int port = 25555;

    int opt;
    opterr = 0; //Disable default error message.
    while ((opt = getopt(argc, argv, "f:i:p:h")) != -1) {
        switch (opt) {
            case 'f':
                qfile = optarg;
                break;
            case 'i':
                ip = optarg;
                break;
            case 'p':
                port = atoi(optarg);
                break;
            case 'h':
                printf("Usage: %s [-f question_file] [-i IP_address] [-p port_number] [-h]\n", argv[0]);
                printf("  -f question_file\tDefault to \"question.txt\"\n");
                printf("  -i IP_address\t\tDefault to \"127.0.0.1\"\n");
                printf("  -p port_number\tDefault to 25555\n");
                printf("  -h\t\t\tDisplay this help info\n");
                exit(0);
            case '?':
                fprintf(stderr, "Error: Unknown option '-%c' received.\n", optopt);
                exit(EXIT_FAILURE);
            default:
                abort();
        }
    }

    // END: Task 1.1

    int    server_fd;
    int    client_fd;
    struct sockaddr_in server_addr;
    struct sockaddr_in in_addr;
    socklen_t addr_size = sizeof(in_addr);

        /* STEP 1
            Create and set up a socket
        */
    server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if(server_fd == -1){
        perror("socket");
        exit(EXIT_FAILURE);
    }
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family      = AF_INET;
    server_addr.sin_port        = htons(port);
    server_addr.sin_addr.s_addr = inet_addr(ip);

        /* STEP 2
            Bind the file descriptor with address structure
            so that clients can find the address
        */

    //From stack overflow, https://stackoverflow.com/questions/5106674/error-address-already-in-use-while-binding-socket-with-address-but-the-port-num
    //Socket wouldn't properly close...
    int option = 1;
    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &option, sizeof(option)) == -1) {
        perror("setsockopt");
        exit(1);
    }

    //End

    if(bind(server_fd, (struct sockaddr *) &server_addr, sizeof(server_addr)) == -1){
        perror("bind");
        exit(EXIT_FAILURE);
    }

        /* STEP 3
            Listen to at most 5 incoming connections
        */
   

    if (listen(server_fd, MAX_CONN) == 0)
        printf("Welcome to 392 Trivia!\n");
    else perror("listen");
    //Task 1.2: Read the Question Database
    int num_questions;
    struct Entry questions[50];
    num_questions = read_questions(questions, qfile);

        /* STEP 4
            Accept connections from clients
            to enable communication
        */

    fd_set myset;
    FD_SET(server_fd, &myset);
    int maxfd = server_fd;
    int n_conn = 0;
    int canStart = 0;

    char* nameprompt = "Please type your name: ";
    int   recvbytes = 0;
    char  buffer[1024];

    // Storing the client fd's in an array to preserve them through loop iterations.
    int cfds[MAX_CONN];
    for(int i=0; i<MAX_CONN; i++) cfds[i] = -1;

    int question_no = -1;
    struct Player players[MAX_CONN] = {{-1, 0, ""}};

    while(1){
        /*
        After the select() call, only the fd's that are ready
        will be left in the set, so we need to reinitialize it.
        */
        FD_SET(server_fd, &myset);
        maxfd = server_fd;
        for(int i=0; i<MAX_CONN; i++){
            if(cfds[i] != -1){
                FD_SET(cfds[i], &myset);
                // Also determine maxfd.
                if(cfds[i] > maxfd) maxfd = cfds[i];
            }
        }

        // Monitor file descriptors.
        select(maxfd+1, &myset, NULL, NULL, NULL);
        if(FD_ISSET(server_fd, &myset)){
            client_fd  =   accept(server_fd,
                            (struct sockaddr*)&in_addr,
                            &addr_size);
            if(client_fd == -1){
                perror("accept");
                exit(EXIT_FAILURE);
            }
            if(n_conn < MAX_CONN){
                n_conn++;
                printf("New connection detected!\n");
                write(client_fd, nameprompt, strlen(nameprompt));
                fflush(stdout);

                int player_index = -1;

                for(int i=0; i<MAX_CONN; i++){
                    if(cfds[i]==-1){
                        player_index = i;
                        cfds[i] = client_fd;
                        break;
                    }
                }
                if (player_index != -1) {
                    printf("Added player #%d!\n", player_index);
                    fflush(stdout);
                    players[player_index].fd = client_fd;
                    players[player_index].score = 0;
                    strcpy(players[player_index].name, "");
                }
            } else {
                close(client_fd);
                printf("Max connections reached!\n");
                fflush(stdout);
            }
        }

        for (int i = 0; i < MAX_CONN; i++) {
            if (cfds[i] != -1 && FD_ISSET(cfds[i], &myset)) {
                recvbytes = recv(cfds[i], buffer, 1024, 0);
                if(recvbytes == -1){
                    perror("recv");
                    exit(EXIT_FAILURE);
                }
                if (recvbytes == 0) {
                    // OLD CODE FOR REMOVING A PLAYER (NO LONGER NEEDED BECAUSE WHOLE GAME ENDS.)
                    // int disconnected_fd = cfds[i];
                    // close(cfds[i]);
                    // cfds[i] = -1;
                    // for(int j=0; j<MAX_CONN; j++){
                    //     //Remove player info when they quit.
                    //     if(players[j].fd== disconnected_fd){
                    //         players[j].fd = -1;
                    //         players[j].score = 0;
                    //         strcpy(players[j].name, "");
                    //         //Restart the game. [U]
                    //         // question_no=-1;
                    //     } else if (players[j].fd != -1) {
                    //         players[j].fd = cfds[j];
                    //     }
                    // }
                    // n_conn--;
                    printf("Lost connection!\n");
                    close_connections(server_fd, cfds);
                    return 0;
                } else {
                    buffer[recvbytes] = 0;
                    //Receiving input from player. If question_no = -1 then the game hasn't started yet, so the input is their name. Else, the game has started and their input is the answer.
                    if(question_no==-1){
                        printf("Hi %s!\n", buffer);
                        strcpy(players[i].name, buffer);
                        canStart = 1;
                        for(int j=0; j<n_conn; j++){
                            if(strcmp(players[j].name, "")==0){ 
                                canStart = 0;
                                break;
                            }
                        }
                    }
                    //Once all players have joined start running this code.
                    if(n_conn == MAX_CONN && canStart == 1 && question_no <= num_questions){
                        //Code for processing answer here...
                        if(question_no == -1){ 
                            printf("The game starts now!\n");
                        }
                        // Answer will be -1 if an answer is not processed, and 3 if any invalid option.
                        int answer = -1;
                        if (buffer[0] == '1') {
                            answer = 0;
                        } else if (buffer[0] == '2') {
                            answer = 1;
                        } else if (buffer[0] == '3') {
                            answer = 2;
                        } else {
                            answer = 3;
                        }

                        //Don't check for correct answer for name input.
                        if(question_no > -1){
                            if (answer != -1) {
                                if (answer == questions[question_no].answer_idx) {
                                    printf("[%s] Correct answer!\n", players[i].name);
                                    players[i].score++;
                                } else {
                                    printf("[%s] Incorrect answer!\n", players[i].name);
                                    players[i].score--;
                                }
                                printf("The correct answer was: %s\n", questions[question_no].options[questions[question_no].answer_idx]);

                                if (question_no >= num_questions-1) {
                                    int maxscore = -999;
                                    for (int j = 0; j < n_conn; j++) {
                                        printf("[%s] Score: %d\n", players[j].name, players[j].score);
                                        if(players[j].score > maxscore) maxscore = players[j].score;
                                    }
                                    for (int j = 0; j < n_conn; j++) {
                                        if(players[j].score == maxscore){
                                            printf("Congrats, %s!\n", players[j].name);
                                        }
                                        if (players[j].fd != -1) {
                                            write(players[j].fd, "Game over!\n", strlen("Game over!\n"));
                                            fflush(stdout);
                                        }
                                    }
                                    close_connections(server_fd, cfds);
                                    return 0;
                                    
                                }
                            }
                        } 
                        question_no++;

                        //Display next question.
                        char qstring[4000];
                        char astring[4000];
                        memset(qstring, 0, sizeof(qstring));
                        memset(astring, 0, sizeof(astring));
                        int alen = 0;
                        if(question_no != 0){
                            alen = sprintf(astring, "The correct answer was: %s\n", questions[question_no-1].options[questions[question_no-1].answer_idx]);
                        }
                        
                        sprintf(qstring, "Question %d: %s\n\
1: %s\n\
2: %s\n\
3: %s\n",                        
                        question_no+1, 
                        questions[question_no].prompt,
                        questions[question_no].options[0],
                        questions[question_no].options[1],
                        questions[question_no].options[2]);

                        printf("%s", qstring);
                        memset(qstring, 0, sizeof(qstring));

                        int qlen = sprintf(qstring, "Question %d: %s\n\
Press 1: %s\n\
Press 2: %s\n\
Press 3: %s\n",                        
                        question_no+1, 
                        questions[question_no].prompt,
                        questions[question_no].options[0],
                        questions[question_no].options[1],
                        questions[question_no].options[2]);

                        fflush(stdout);
                        for(int i=0; i<n_conn; i++){
                            write(players[i].fd, astring, alen);
                            write(players[i].fd, qstring, qlen);
                            fflush(stdout);
                        }
                    }
                }
            }
        }
    }
    close_connections(server_fd, cfds);
    return 0;
}
