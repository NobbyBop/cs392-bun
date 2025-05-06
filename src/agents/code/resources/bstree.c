/*******************************************************************************
 * Name        : bstree.c
 * Author      : Nicholas Mirigliani
 * Pledge      : I pledge my honor that I have abided by the Stevens Honor System
 ******************************************************************************/
#include "bstree.h"

void add_node(void* data , size_t size, tree_t* tr, int (*cmpr)(void*,void*)){
    // Create a new node and assign it data.
    node_t* new_node = (node_t*)malloc(sizeof(node_t));
    new_node->data = malloc(size);
    new_node->left=NULL;
    new_node->right=NULL;
    for(int i = 0; i < size; i++){
        ((char*)new_node->data)[i] = ((char*)data)[i];
    }

    //If current root is null, set the new node to the root.
    if(tr->root == NULL){
        tr->root = new_node;
    //Otherwise, find where it should go in the tree.
    } else {
        node_t* curr_node = tr->root;
        while(1==1){
            if(cmpr(data, curr_node->data) < 0){
                if(curr_node->left == NULL){
                    curr_node->left = new_node;
                    break;
                }
                curr_node = curr_node->left;
            } else {
                if(curr_node->right== NULL){
                    curr_node->right = new_node;
                    break;
                }
                curr_node = curr_node->right;
            }
        }
    }
    return;
}

void print_tree(node_t* node, void (*prnt)(void*)){
    if(node==NULL) return;
    else {
        print_tree(node->left, prnt);
        prnt(node->data);
        print_tree(node->right,prnt);
    }
}

void destroy_all(node_t* node){
    if(node==NULL) return;
    else {
        destroy_all(node->left);
        destroy_all(node->right);
        free(node->data);
        free(node);
    }
}

void destroy(tree_t* tr){
    if (tr->root != NULL) {
        destroy_all(tr->root);
        tr->root=NULL;
        free(tr);
    }
}
